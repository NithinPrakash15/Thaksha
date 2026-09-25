import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";
import { verifyRazorpaySignature } from "@/lib/payment-gateways";

export const Route = createFileRoute("/api/webhooks/payment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rawBody = await request.text();
          const signature = request.headers.get("x-razorpay-signature") || "";
          const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || "";

          // Verify signature if secret is configured
          if (webhookSecret && !webhookSecret.includes("placeholder")) {
            const isValid = verifyRazorpaySignature(rawBody, signature, webhookSecret);
            if (!isValid) {
              console.warn("Unauthorized webhook signature detected.");
              return new Response(JSON.stringify({ error: "Invalid signature" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
              });
            }
          }

          let event: any = {};
          try {
            event = JSON.parse(rawBody);
          } catch {
            return new Response(JSON.stringify({ error: "Malformed payload" }), {
              status: 400,
              headers: { "Content-Type": "application/json" },
            });
          }

          const eventType = event.event || "";
          const payload = event.payload || {};
          const paymentEntity = payload.payment?.entity || {};
          const orderId = paymentEntity.order_id || paymentEntity.notes?.orderId;
          const transactionId = paymentEntity.id;

          // 1. Handle Successful Payment Capture (payment.captured or order.paid)
          if (eventType === "payment.captured" || eventType === "order.paid") {
            if (!orderId && !paymentEntity.receipt) {
              return new Response(JSON.stringify({ status: "acknowledged_no_order_id" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            const order = await prisma.order.findFirst({
              where: {
                OR: [
                  { id: orderId },
                  { orderNumber: paymentEntity.receipt },
                  { payments: { some: { reference: orderId } } },
                ],
              },
              include: { items: true, payments: true },
            });

            if (!order) {
              console.warn(`Webhook received for unknown order: ${orderId}`);
              return new Response(JSON.stringify({ status: "order_not_found" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            // IDEMPOTENCY GUARD: If order is already paid, do not decrement stock again!
            if (order.status === "PAID" || order.status === "PROCESSING" || order.status === "SHIPPED") {
              return new Response(JSON.stringify({ status: "already_processed" }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
              });
            }

            // Execute atomic update
            await prisma.$transaction(async (tx) => {
              // Mark order as PAID
              await tx.order.update({
                where: { id: order.id },
                data: { status: "PAID" },
              });

              // Mark payment record as CAPTURED
              if (order.payments.length > 0) {
                await tx.payment.update({
                  where: { id: order.payments[0].id },
                  data: {
                    status: "CAPTURED",
                    transactionId,
                    paymentMethod: paymentEntity.method || "Razorpay Gateway",
                  },
                });
              }

              // Safely decrement stock inventory
              for (const item of order.items) {
                if (item.productId) {
                  await tx.product.update({
                    where: { id: item.productId },
                    data: {
                      stock: { decrement: item.quantity },
                    },
                  });
                }
              }

              // Create notification
              if (order.userId) {
                await tx.notification.create({
                  data: {
                    userId: order.userId,
                    title: `Payment Received: ${order.orderNumber}`,
                    message: `Payment confirmed via webhook. Your ritual tools are being curated.`,
                    type: "PAYMENT",
                    link: `/orders/${order.id}`,
                  },
                });
              }
            });

            return new Response(JSON.stringify({ status: "success", orderNumber: order.orderNumber }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          // 2. Handle Payment Failure
          if (eventType === "payment.failed") {
            const errorDesc = paymentEntity.error_description || "Payment failed at gateway";
            if (orderId) {
              await prisma.payment.updateMany({
                where: { reference: orderId },
                data: { status: "FAILED", errorDetails: errorDesc },
              }).catch(() => {});
            }

            return new Response(JSON.stringify({ status: "failure_logged" }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          return new Response(JSON.stringify({ status: "event_ignored", event: eventType }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error: any) {
          console.error("Webhook processing error:", error);
          return new Response(JSON.stringify({ error: "Internal processing error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
