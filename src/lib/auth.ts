import crypto from "node:crypto";
import { prisma } from "./prisma";
import type { Role, User } from "@prisma/client";

const SESSION_COOKIE_NAME = "thaksha_session";
const SESSION_EXPIRY_DAYS = 30;

/**
 * Hashes password using Node.js scrypt with a random 16-byte salt.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a password against the stored salt:derivedKey hash using timingSafeEqual.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const keyBuffer = Buffer.from(key, "hex");
    return crypto.timingSafeEqual(derivedKey, keyBuffer);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy session token and saves its SHA-256 hash in PostgreSQL.
 */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return { token: rawToken, expiresAt };
}

/**
 * Validates a raw session token and returns the associated User if active.
 */
export async function getUserBySessionToken(rawToken: string): Promise<User | null> {
  if (!rawToken || typeof rawToken !== "string") return null;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;

  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return session.user;
}

/**
 * Destroys a session token in the database.
 */
export async function destroySession(rawToken: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await prisma.session.deleteMany({ where: { tokenHash } }).catch(() => {});
}

/**
 * Parses cookies from standard Cookie header string.
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  const cookies: Record<string, string> = {};
  const pairs = cookieHeader.split(";");
  for (const pair of pairs) {
    const idx = pair.indexOf("=");
    if (idx < 0) continue;
    const key = pair.substring(0, idx).trim();
    const val = pair.substring(idx + 1).trim();
    cookies[key] = decodeURIComponent(val);
  }
  return cookies;
}

/**
 * Formats a Set-Cookie header string for session token.
 */
export function buildSessionCookie(token: string, expiresAt: Date): string {
  const isProd = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    token,
  )}; Path=/; Expires=${expiresAt.toUTCString()}; HttpOnly; SameSite=Lax${
    isProd ? "; Secure" : ""
  }`;
}

/**
 * Formats a Set-Cookie header string to clear the session cookie.
 */
export function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`;
}

/**
 * Extracts and verifies the current logged-in user from a web Request.
 */
export async function getSessionUser(request: Request): Promise<User | null> {
  const cookieHeader = request.headers.get("cookie");
  const cookies = parseCookies(cookieHeader);
  const token = cookies[SESSION_COOKIE_NAME];
  if (!token) return null;
  return getUserBySessionToken(token);
}

/**
 * Checks if the request comes from an authenticated user with ADMIN role.
 */
export async function getSessionAdmin(request: Request): Promise<User | null> {
  const user = await getSessionUser(request);
  if (!user || user.role !== "ADMIN") return null;
  return user;
}
