export type AdminSession = { userId: string; role: "ADMIN" };

// TODO: Replace with real server-side Prisma RBAC + secure sessions/JWT.
export async function getAdminSession(): Promise<AdminSession | null> {
  return null;
}
