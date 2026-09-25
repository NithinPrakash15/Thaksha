import crypto from "node:crypto";

/**
 * Verifies Razorpay webhook signature using HMAC SHA256.
 */
export function verifyRazorpaySignature(
  rawBody: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay checkout payment signature.
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string,
): boolean {
  if (!signature || !secret) return false;
  try {
    const payload = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    return false;
  }
}

/**
 * Creates Razorpay Order on Razorpay API if live credentials are configured.
 */
export async function createRazorpayOrder({
  amountCents,
  receipt,
  notes,
}: {
  amountCents: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ id: string; amount: number; currency: string } | null> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // If live credentials are placeholder, return null to gracefully fallback to sandbox mode
  if (!keyId || !keySecret || keyId.includes("dummy") || keySecret.includes("placeholder")) {
    return null;
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountCents, // Razorpay takes amounts in paise (cents)
        currency: "INR",
        receipt,
        notes,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Razorpay order creation error:", err);
      return null;
    }

    const data = await res.json();
    return {
      id: data.id,
      amount: data.amount,
      currency: data.currency,
    };
  } catch (err) {
    console.error("Razorpay fetch error:", err);
    return null;
  }
}
