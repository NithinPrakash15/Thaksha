import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import crypto from "node:crypto";
import { prisma } from "./prisma";
import {
  hashPassword,
  verifyPassword,
  createSession,
  rotateSession,
  getUserBySessionToken,
  checkRateLimit,
  recordAuthAttempt,
} from "./auth";

const SESSION_COOKIE_NAME = "thaksha_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export type SafeAdminUser = {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN";
  provider: "LOCAL" | "GOOGLE";
  avatarUrl: string | null;
  createdAt: string;
};

/**
 * Checks whether an active administrator exists in the system.
 * Returns setupNeeded: true if zero admins exist.
 */
export const checkAdminSetupStatusFn = createServerFn({ method: "GET" }).handler(async () => {
  const adminCount = await prisma.user.count({
    where: { role: "ADMIN", status: "ACTIVE" },
  });
  return { setupNeeded: adminCount === 0 };
});

/**
 * Initial Administrator Setup.
 * PERMANENTLY DISABLED once an active ADMIN account exists.
 */
export const initialAdminSetupFn = createServerFn({ method: "POST" })
  .validator((d: { name: string; email: string; password: string; confirmPassword: string }) => d)
  .handler(async ({ data }) => {
    // 1. Strict guard: Reject immediately if an admin already exists
    const adminCount = await prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE" },
    });
    if (adminCount > 0) {
      throw new Error("Initial admin setup is permanently disabled. An administrator account already exists.");
    }

    const name = data.name?.trim();
    const email = data.email?.toLowerCase().trim();
    const password = data.password;
    const confirmPassword = data.confirmPassword;

    if (!name || name.length < 2) {
      throw new Error("Please enter a valid administrator name (at least 2 characters).");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new Error("Please provide a valid administrator email address.");
    }

    if (password !== confirmPassword) {
      throw new Error("Password and confirmation do not match.");
    }

    // High-security password requirements
    if (password.length < 12) {
      throw new Error("Password must be at least 12 characters long.");
    }
    if (!/[A-Z]/.test(password)) {
      throw new Error("Password must contain at least one uppercase letter (A-Z).");
    }
    if (!/[a-z]/.test(password)) {
      throw new Error("Password must contain at least one lowercase letter (a-z).");
    }
    if (!/[0-9]/.test(password)) {
      throw new Error("Password must contain at least one numeric digit (0-9).");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
      throw new Error("Password must contain at least one special character.");
    }

    const passwordHash = hashPassword(password);

    // Check if account already exists with this email
    const existing = await prisma.user.findUnique({ where: { email } });
    let adminUser;
    if (existing) {
      adminUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          passwordHash,
          role: "ADMIN",
          status: "ACTIVE",
          provider: "LOCAL",
          lastLoginAt: new Date(),
        },
      });
    } else {
      adminUser = await prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          role: "ADMIN",
          status: "ACTIVE",
          provider: "LOCAL",
          lastLoginAt: new Date(),
        },
      });
    }

    // Create session and set secure HttpOnly cookie
    const oldToken = getCookie(SESSION_COOKIE_NAME) || null;
    const { token } = await rotateSession(oldToken, adminUser.id);

    setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });

    // Write audit log
    await prisma.auditLog.create({
      data: {
        adminId: adminUser.id,
        action: "INITIAL_ADMIN_SETUP_COMPLETED",
        entity: "User",
        entityId: adminUser.id,
        details: { email: adminUser.email, timestamp: new Date().toISOString() },
      },
    }).catch(() => {});

    return {
      success: true,
      user: {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        provider: adminUser.provider,
        avatarUrl: adminUser.avatarUrl,
        createdAt: adminUser.createdAt.toISOString(),
      } as SafeAdminUser,
    };
  });

/**
 * Changes administrator password with current password verification and session invalidation.
 */
export const adminChangePasswordFn = createServerFn({ method: "POST" })
  .validator((d: { currentPassword: string; newPassword: string; confirmPassword: string }) => d)
  .handler(async ({ data }) => {
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) throw new Error("Unauthorized. Administrative session required.");

    const admin = await getUserBySessionToken(token);
    if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
      throw new Error("Forbidden. Access restricted to authorized active administrators.");
    }

    if (!admin.passwordHash) {
      throw new Error("This administrator account has no existing password hash configured.");
    }

    const isCurrentValid = verifyPassword(data.currentPassword, admin.passwordHash);
    if (!isCurrentValid) {
      throw new Error("Current password verification failed. Please check your credentials.");
    }

    if (data.newPassword !== data.confirmPassword) {
      throw new Error("New password and confirmation do not match.");
    }

    if (data.currentPassword === data.newPassword) {
      throw new Error("New password cannot be identical to the current password.");
    }

    if (data.newPassword.length < 12) {
      throw new Error("New password must be at least 12 characters long.");
    }
    if (!/[A-Z]/.test(data.newPassword)) {
      throw new Error("New password must contain at least one uppercase letter (A-Z).");
    }
    if (!/[a-z]/.test(data.newPassword)) {
      throw new Error("New password must contain at least one lowercase letter (a-z).");
    }
    if (!/[0-9]/.test(data.newPassword)) {
      throw new Error("New password must contain at least one numeric digit (0-9).");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(data.newPassword)) {
      throw new Error("New password must contain at least one special character.");
    }

    const newPasswordHash = hashPassword(data.newPassword);

    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate other active sessions to terminate any compromised devices
    const currentTokenHash = crypto.createHash("sha256").update(token).digest("hex");
    await prisma.session.deleteMany({
      where: {
        userId: admin.id,
        tokenHash: { not: currentTokenHash },
      },
    }).catch(() => {});

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "ADMIN_PASSWORD_CHANGED",
        entity: "User",
        entityId: admin.id,
        details: { timestamp: new Date().toISOString() },
      },
    }).catch(() => {});

    return { success: true, message: "Administrator password updated successfully. Other sessions invalidated." };
  });

/**
 * Changes administrator email address with password confirmation.
 */
export const adminChangeEmailFn = createServerFn({ method: "POST" })
  .validator((d: { newEmail: string; passwordConfirm: string }) => d)
  .handler(async ({ data }) => {
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) throw new Error("Unauthorized. Administrative session required.");

    const admin = await getUserBySessionToken(token);
    if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
      throw new Error("Forbidden. Access restricted to authorized active administrators.");
    }

    if (!admin.passwordHash) {
      throw new Error("Password verification required to update administrative email.");
    }

    const isCurrentValid = verifyPassword(data.passwordConfirm, admin.passwordHash);
    if (!isCurrentValid) {
      throw new Error("Current password verification failed. Email update rejected.");
    }

    const newEmail = data.newEmail?.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!newEmail || !emailRegex.test(newEmail)) {
      throw new Error("Please enter a valid email address.");
    }

    if (newEmail === admin.email) {
      throw new Error("New email must be different from current email.");
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing) {
      throw new Error("An account with this email address already exists.");
    }

    const oldEmail = admin.email;
    await prisma.user.update({
      where: { id: admin.id },
      data: { email: newEmail },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "ADMIN_EMAIL_CHANGED",
        entity: "User",
        entityId: admin.id,
        details: { oldEmail, newEmail, timestamp: new Date().toISOString() },
      },
    }).catch(() => {});

    return { success: true, newEmail };
  });

/**
 * Requests a secure, single-use password reset token for administrator account.
 */
export const adminRequestPasswordResetFn = createServerFn({ method: "POST" })
  .validator((d: { email: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email?.toLowerCase().trim();
    if (!email) {
      throw new Error("Email address is required.");
    }

    // Rate limiting reset requests
    const rateCheck = checkRateLimit(`pwd_reset_${email}`);
    if (rateCheck.isLocked) {
      throw new Error(`Too many password reset requests. Please wait ${rateCheck.waitMinutes} minutes before retrying.`);
    }
    recordAuthAttempt(`pwd_reset_${email}`, false);

    const admin = await prisma.user.findUnique({ where: { email } });

    if (admin && admin.role === "ADMIN" && admin.status === "ACTIVE") {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiration

      // Secure single-use token representation in StoreSetting
      await prisma.storeSetting.upsert({
        where: { key: `admin_reset_${tokenHash}` },
        update: {
          value: JSON.stringify({ userId: admin.id, email: admin.email, expiresAt: expiresAt.toISOString() }),
        },
        create: {
          key: `admin_reset_${tokenHash}`,
          value: JSON.stringify({ userId: admin.id, email: admin.email, expiresAt: expiresAt.toISOString() }),
          description: `Password reset token for admin ${admin.email}`,
        },
      });

      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          action: "ADMIN_PASSWORD_RESET_REQUESTED",
          entity: "User",
          entityId: admin.id,
          details: { email: admin.email, timestamp: new Date().toISOString() },
        },
      }).catch(() => {});

      // Clear record on successful issue
      recordAuthAttempt(`pwd_reset_${email}`, true);

      // Console audit log for environment / operator
      console.log(`[AUTH SECURITY] Administrative reset token generated for ${admin.email}: ${rawToken}`);
    }

    // Generic response to prevent account enumeration
    return {
      success: true,
      message:
        "If an active administrative account is registered with this email, secure password reset instructions have been dispatched. The reset token is valid for 1 hour.",
    };
  });

/**
 * Resets administrator password using a single-use token.
 */
export const adminResetPasswordWithTokenFn = createServerFn({ method: "POST" })
  .validator((d: { token: string; newPassword: string; confirmPassword: string }) => d)
  .handler(async ({ data }) => {
    const token = data.token?.trim();
    const newPassword = data.newPassword;
    const confirmPassword = data.confirmPassword;

    if (!token) {
      throw new Error("Password reset token is required.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("New password and confirmation do not match.");
    }

    if (newPassword.length < 12) {
      throw new Error("Password must be at least 12 characters long.");
    }
    if (!/[A-Z]/.test(newPassword)) {
      throw new Error("Password must contain at least one uppercase letter (A-Z).");
    }
    if (!/[a-z]/.test(newPassword)) {
      throw new Error("Password must contain at least one lowercase letter (a-z).");
    }
    if (!/[0-9]/.test(newPassword)) {
      throw new Error("Password must contain at least one numeric digit (0-9).");
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(newPassword)) {
      throw new Error("Password must contain at least one special character.");
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const settingKey = `admin_reset_${tokenHash}`;

    const tokenRecord = await prisma.storeSetting.findUnique({
      where: { key: settingKey },
    });

    if (!tokenRecord) {
      throw new Error("Invalid, expired, or already-used reset token. Please request a new reset link.");
    }

    let payload: { userId: string; email: string; expiresAt: string };
    try {
      payload = JSON.parse(tokenRecord.value);
    } catch {
      await prisma.storeSetting.delete({ where: { key: settingKey } }).catch(() => {});
      throw new Error("Corrupted reset token. Please request a new reset link.");
    }

    if (new Date(payload.expiresAt) < new Date()) {
      await prisma.storeSetting.delete({ where: { key: settingKey } }).catch(() => {});
      throw new Error("Reset token has expired (tokens are valid for 1 hour). Please request a new link.");
    }

    const admin = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!admin || admin.role !== "ADMIN" || admin.status !== "ACTIVE") {
      await prisma.storeSetting.delete({ where: { key: settingKey } }).catch(() => {});
      throw new Error("Associated administrator account is invalid or inactive.");
    }

    // Burn token immediately to ensure single-use
    await prisma.storeSetting.delete({ where: { key: settingKey } });

    const newPasswordHash = hashPassword(newPassword);

    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash: newPasswordHash },
    });

    // Invalidate ALL sessions across all devices
    await prisma.session.deleteMany({
      where: { userId: admin.id },
    }).catch(() => {});

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "ADMIN_PASSWORD_RESET_COMPLETED",
        entity: "User",
        entityId: admin.id,
        details: { email: admin.email, timestamp: new Date().toISOString() },
      },
    }).catch(() => {});

    return {
      success: true,
      message: "Password reset successfully. Please sign in with your new password.",
    };
  });

/**
 * Invalidates all other active sessions for current admin.
 */
export const adminTerminateOtherSessionsFn = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) throw new Error("Unauthorized.");

  const admin = await getUserBySessionToken(token);
  if (!admin || admin.role !== "ADMIN") throw new Error("Forbidden.");

  const currentTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const result = await prisma.session.deleteMany({
    where: {
      userId: admin.id,
      tokenHash: { not: currentTokenHash },
    },
  });

  return { success: true, count: result.count };
});
