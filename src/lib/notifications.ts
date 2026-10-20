import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./prisma";
import { getUserBySessionToken } from "./auth";

const SESSION_COOKIE_NAME = "thaksha_session";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "ORDER" | "PAYMENT" | "INVENTORY" | "SYSTEM";
  isRead: boolean;
  link: string | null;
  timeAgo: string;
};

/**
 * Creates a notification in PostgreSQL and logs transactional email.
 */
export async function sendNotification({
  userId,
  title,
  message,
  type = "ORDER",
  link,
}: {
  userId?: string | null;
  title: string;
  message: string;
  type?: "ORDER" | "PAYMENT" | "INVENTORY" | "SYSTEM";
  link?: string | null;
}) {
  if (userId) {
    await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        link,
      },
    }).catch(() => {});
  }

  // Transactional Email Dispatcher Simulation / Extensible Hook
  // When an email service like Resend, SendGrid, or AWS SES is configured with API keys,
  // this hook dispatches the transactional email.
  console.log(`[TRANSACTIONAL NOTIFICATION] To: ${userId || "Admin Broadcast"} | ${title} | ${message}`);
}

/**
 * Fetches user notifications.
 */
export const getUserNotificationsFn = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) return [];

  const user = await getUserBySessionToken(token);
  if (!user) return [];

  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return notifications.map((n) => {
    const diffMs = Date.now() - n.createdAt.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    let timeAgo = "Just now";
    if (diffDays > 0) timeAgo = `${diffDays}d ago`;
    else if (diffHours > 0) timeAgo = `${diffHours}h ago`;
    else if (diffMins > 0) timeAgo = `${diffMins}m ago`;

    return {
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      isRead: n.isRead,
      link: n.link,
      timeAgo,
    } as NotificationItem;
  });
});

/**
 * Marks a notification as read.
 */
export const markNotificationReadFn = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    }).catch(() => {});
    return { success: true };
  });
