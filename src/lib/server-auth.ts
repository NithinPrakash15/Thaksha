import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { prisma } from "./prisma";
import {
  hashPassword,
  verifyPassword,
  createSession,
  rotateSession,
  getUserBySessionToken,
  destroySession,
  checkRateLimit,
  recordAuthAttempt,
  verifyGoogleToken,
} from "./auth";

const SESSION_COOKIE_NAME = "thaksha_session";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

export type SafeUser = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: "CUSTOMER" | "ADMIN" | "SUPPORT";
  provider: "LOCAL" | "GOOGLE";
  avatarUrl: string | null;
  createdAt: string;
};

/**
 * Gets currently authenticated user from session cookie.
 */
export const getViewerFn = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) return null;

  const user = await getUserBySessionToken(token);
  if (!user || user.status === "LOCKED" || user.status === "SUSPENDED") return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    role: user.role,
    provider: user.provider,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  } as SafeUser;
});

/**
 * Logs in a customer with email and password, protected by rate limiting.
 */
export const loginCustomerFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email?.toLowerCase().trim();
    const password = data.password;

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    // Rate-limiting check
    const rateCheck = checkRateLimit(email);
    if (rateCheck.isLocked) {
      throw new Error(
        `Too many failed attempts. Account temporarily locked for security. Please try again in ${rateCheck.waitMinutes} minutes.`,
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.passwordHash || user.status !== "ACTIVE") {
      recordAuthAttempt(email, false);
      throw new Error("Invalid email or password.");
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordAuthAttempt(email, false);
      throw new Error("Invalid email or password.");
    }

    // Success - clear failed attempts
    recordAuthAttempt(email, true);

    const oldToken = getCookie(SESSION_COOKIE_NAME) || null;
    const { token } = await rotateSession(oldToken, user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        avatarUrl: user.avatarUrl,
      },
    };
  });

/**
 * Verifies Google ID token server-side and logs in or creates the customer account.
 */
export const loginWithGoogleFn = createServerFn({ method: "POST" })
  .validator((d: { credential: string }) => d)
  .handler(async ({ data }) => {
    const { credential } = data;
    if (!credential) {
      throw new Error("Google credential is required.");
    }

    // Server-side verification with Google
    const googlePayload = await verifyGoogleToken(credential);

    // Find existing user by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { googleId: googlePayload.sub },
          { email: googlePayload.email },
        ],
      },
    });

    if (user) {
      if (user.status !== "ACTIVE") {
        throw new Error("This account is currently suspended.");
      }

      // Link googleId and avatar if not already set
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || googlePayload.sub,
          avatarUrl: user.avatarUrl || googlePayload.picture,
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create new customer account
      user = await prisma.user.create({
        data: {
          email: googlePayload.email,
          name: googlePayload.name,
          googleId: googlePayload.sub,
          avatarUrl: googlePayload.picture,
          provider: "GOOGLE",
          status: "ACTIVE",
          role: "CUSTOMER",
          lastLoginAt: new Date(),
        },
      });
    }

    const oldToken = getCookie(SESSION_COOKIE_NAME) || null;
    const { token } = await rotateSession(oldToken, user.id);

    setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        avatarUrl: user.avatarUrl,
      },
    };
  });

/**
 * Registers a new customer account.
 */
export const registerCustomerFn = createServerFn({ method: "POST" })
  .validator((d: { name: string; email: string; phone?: string; password: string }) => d)
  .handler(async ({ data }) => {
    const name = data.name?.trim();
    const email = data.email?.toLowerCase().trim();
    const phone = data.phone?.trim();
    const password = data.password;

    if (!name || !email || !password) {
      throw new Error("Name, email, and password are required.");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing && existing.passwordHash) {
      throw new Error("An account with this email already exists. Please sign in.");
    }

    const passwordHash = hashPassword(password);

    let user;
    if (existing) {
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { name, phone, passwordHash, role: "CUSTOMER", lastLoginAt: new Date() },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name,
          email,
          phone,
          passwordHash,
          provider: "LOCAL",
          status: "ACTIVE",
          role: "CUSTOMER",
          lastLoginAt: new Date(),
        },
      });
    }

    const oldToken = getCookie(SESSION_COOKIE_NAME) || null;
    const { token } = await rotateSession(oldToken, user.id);

    setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        avatarUrl: user.avatarUrl,
      },
    };
  });

/**
 * Admin portal login with strict role enforcement and audit logging.
 */
export const loginAdminFn = createServerFn({ method: "POST" })
  .validator((d: { email: string; password: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email?.toLowerCase().trim();
    const password = data.password;

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const rateCheck = checkRateLimit(email);
    if (rateCheck.isLocked) {
      throw new Error(
        `Too many administrative authentication attempts. Access locked for ${rateCheck.waitMinutes} minutes.`,
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || user.role !== "ADMIN" || !user.passwordHash || user.status !== "ACTIVE") {
      recordAuthAttempt(email, false);
      throw new Error("Invalid credentials or unauthorized administrative access.");
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordAuthAttempt(email, false);
      throw new Error("Invalid credentials or unauthorized administrative access.");
    }

    recordAuthAttempt(email, true);

    const oldToken = getCookie(SESSION_COOKIE_NAME) || null;
    const { token } = await rotateSession(oldToken, user.id);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    setCookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });

    // Record audit log
    await prisma.auditLog.create({
      data: {
        adminId: user.id,
        action: "ADMIN_LOGIN",
        entity: "User",
        entityId: user.id,
        details: { email: user.email, timestamp: new Date().toISOString() },
      },
    }).catch(() => {});

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        provider: user.provider,
        avatarUrl: user.avatarUrl,
      },
    };
  });

/**
 * Logs out the current user and clears session cookie.
 */
export const logoutUserFn = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (token) {
    await destroySession(token);
    deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
  }
  return { success: true };
});

/**
 * Updates customer profile and address.
 */
export const updateCustomerProfileFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      name: string;
      phone: string;
      line1?: string;
      city?: string;
      region?: string;
      postal?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) throw new Error("Authentication required.");

    const user = await getUserBySessionToken(token);
    if (!user) throw new Error("Authentication required.");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        phone: data.phone,
      },
    });

    if (data.line1 && data.city && data.postal) {
      const defaultAddr = await prisma.address.findFirst({
        where: { userId: user.id, isDefault: true },
      });

      if (defaultAddr) {
        await prisma.address.update({
          where: { id: defaultAddr.id },
          data: {
            name: data.name,
            phone: data.phone,
            line1: data.line1,
            city: data.city,
            region: data.region,
            postal: data.postal,
          },
        });
      } else {
        await prisma.address.create({
          data: {
            userId: user.id,
            name: data.name,
            phone: data.phone,
            line1: data.line1,
            city: data.city,
            region: data.region,
            postal: data.postal,
            country: "India",
            isDefault: true,
          },
        });
      }
    }

    return { success: true };
  });
