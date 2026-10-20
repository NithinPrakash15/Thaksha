import { prisma } from "./prisma";

export const ADMIN_NOTIFICATION_PHONE = process.env.ADMIN_NOTIFICATION_PHONE || "8891509026";

/**
 * Dispatches an immediate order alert to the store administrator's phone (8891509026)
 * via SMS (Fast2SMS / Twilio / MSG91), webhook integration, and in-app admin dashboard notifications.
 */
export async function sendAdminOrderAlert({
  orderNumber,
  customerName,
  customerPhone,
  customerEmail,
  totalRupees,
  items,
  city,
  postal,
  status = "PAID",
}: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  totalRupees: number;
  items: string[];
  city?: string;
  postal?: string;
  status?: string;
}) {
  const adminPhone = process.env.ADMIN_NOTIFICATION_PHONE || "8891509026";
  const itemsSummary = items.slice(0, 3).join(", ") + (items.length > 3 ? ` +${items.length - 3} more` : "");
  const locationSummary = [city, postal].filter(Boolean).join(", ");

  const alertMessage = `Thaksha New Order #${orderNumber}! Rs.${totalRupees} from ${customerName} (${customerPhone}). Items: ${itemsSummary}${locationSummary ? ` | Delivery: ${locationSummary}` : ""}`;

  console.log(`\n======================================================`);
  console.log(`📱 [ADMIN ORDER ALERT DISPATCHED TO ${adminPhone}]`);
  console.log(`Order Number: #${orderNumber}`);
  console.log(`Status: ${status}`);
  console.log(`Customer: ${customerName} (Phone: ${customerPhone}, Email: ${customerEmail || "N/A"})`);
  console.log(`Total Amount: ₹${totalRupees}`);
  console.log(`Items: ${items.join("; ")}`);
  if (locationSummary) console.log(`Delivery Address: ${locationSummary}`);
  console.log(`Alert Time: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`);
  console.log(`======================================================\n`);

  // 1. Fast2SMS Integration (Optimized for Indian mobile numbers like 8891509026)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const cleanPhone = adminPhone.replace(/\D/g, "").slice(-10);
      const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "q",
          message: alertMessage,
          language: "english",
          flash: 0,
          numbers: cleanPhone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      console.log(`[FAST2SMS_DISPATCH] Result:`, data);
    } catch (smsErr) {
      console.error("[FAST2SMS_DISPATCH_ERROR]", smsErr);
    }
  }

  // 2. Twilio SMS Integration
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  ) {
    try {
      const formattedTo = adminPhone.startsWith("+") ? adminPhone : `+91${adminPhone.replace(/\D/g, "").slice(-10)}`;
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`;
      const basicCredentials = `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`;
      const authHeader = "Basic " + (typeof Buffer !== "undefined" ? Buffer.from(basicCredentials).toString("base64") : btoa(basicCredentials));

      const params = new URLSearchParams();
      params.append("To", formattedTo);
      params.append("From", process.env.TWILIO_PHONE_NUMBER);
      params.append("Body", alertMessage);

      const res = await fetch(twilioUrl, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      console.log(`[TWILIO_SMS_DISPATCH] Dispatched to ${formattedTo}, status: ${res.status}`);
    } catch (twErr) {
      console.error("[TWILIO_SMS_DISPATCH_ERROR]", twErr);
    }
  }

  // 3. Custom Webhook Integration (WhatsApp bot / Telegram / Slack / Zapier)
  if (process.env.ADMIN_NOTIFICATION_WEBHOOK_URL) {
    try {
      await fetch(process.env.ADMIN_NOTIFICATION_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetPhone: adminPhone,
          orderNumber,
          customerName,
          customerPhone,
          customerEmail,
          totalRupees,
          items,
          location: locationSummary,
          status,
          message: alertMessage,
          timestamp: new Date().toISOString(),
        }),
      });
      console.log(`[WEBHOOK_DISPATCH] Dispatched to configured webhook.`);
    } catch (hookErr) {
      console.error("[WEBHOOK_DISPATCH_ERROR]", hookErr);
    }
  }

  // 4. In-App Notification in PostgreSQL for all Admin users
  try {
    const adminUsers = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    for (const adm of adminUsers) {
      await prisma.notification.create({
        data: {
          userId: adm.id,
          title: `Order Received: #${orderNumber}`,
          message: `₹${totalRupees} from ${customerName}. Alert dispatched to ${adminPhone}.`,
          type: "ORDER",
          link: `/admin`,
        },
      }).catch(() => {});
    }
  } catch (dbErr) {
    console.error("[ADMIN_INAPP_NOTIFICATION_ERROR]", dbErr);
  }
}
