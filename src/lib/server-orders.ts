import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./prisma";
import { getUserBySessionToken } from "./auth";
import {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
} from "./payment-gateways";

const SESSION_COOKIE_NAME = "thaksha_session";

export type CartItemInput = {
  slug: string;
  quantity: number;
};

export type PricingCalculation = {
  items: Array<{
    productId: string;
    slug: string;
    name: string;
    sku: string;
    image: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    stock: number;
  }>;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  couponCode?: string;
  outOfStockItems: string[];
};

/**
 * Validates a coupon code server-side against the database.
 */
export const validateCouponFn = createServerFn({ method: "POST" })
  .validator((d: { code: string; subtotalCents: number }) => d)
  .handler(async ({ data }) => {
    const code = data.code?.trim().toUpperCase();
    if (!code) throw new Error("Coupon code is required.");

    const coupon = await prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      throw new Error("Invalid or expired coupon code.");
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new Error("This coupon has expired.");
    }

    if (coupon.usageLimit && coupon.timesUsed >= coupon.usageLimit) {
      throw new Error("This coupon has reached its usage limit.");
    }

    if (coupon.minOrderCents && data.subtotalCents < coupon.minOrderCents) {
      const minInRupees = Math.round(coupon.minOrderCents / 100);
      throw new Error(`Minimum order of ₹${minInRupees} required for this coupon.`);
    }

    let discountCents = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discountCents = Math.round((data.subtotalCents * coupon.discountValue) / 100);
    } else {
      discountCents = coupon.discountValue;
    }

    if (coupon.maxDiscountCents && discountCents > coupon.maxDiscountCents) {
      discountCents = coupon.maxDiscountCents;
    }

    return {
      valid: true,
      code: coupon.code,
      discountCents,
      discountRupees: Math.round(discountCents / 100),
      description: coupon.description,
    };
  });

/**
 * Calculates authoritative order totals and verifies stock availability from PostgreSQL.
 */
export const calculateOrderPricingFn = createServerFn({ method: "POST" })
  .validator((d: { items: CartItemInput[]; couponCode?: string }) => d)
  .handler(async ({ data }) => {
    const { items, couponCode } = data;
    if (!items || items.length === 0) {
      throw new Error("Cart is empty.");
    }

    const slugs = items.map((i) => i.slug);
    const dbProducts = await prisma.product.findMany({
      where: { slug: { in: slugs } },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });

    const productMap = new Map(dbProducts.map((p) => [p.slug, p]));
    const calculatedItems = [];
    const outOfStockItems: string[] = [];
    let subtotalCents = 0;

    for (const item of items) {
      const p = productMap.get(item.slug);
      if (!p) {
        throw new Error(`Product not found: ${item.slug}`);
      }

      if (p.stock < item.quantity) {
        outOfStockItems.push(`${p.name} (only ${p.stock} available)`);
      }

      const unitPriceRupees = Math.round(p.priceCents / 100);
      const lineTotalRupees = unitPriceRupees * item.quantity;
      subtotalCents += p.priceCents * item.quantity;

      calculatedItems.push({
        productId: p.id,
        slug: p.slug,
        name: p.name,
        sku: p.sku,
        image: p.images[0]?.url || "/assets/hero-comb.jpg",
        unitPrice: unitPriceRupees,
        quantity: item.quantity,
        lineTotal: lineTotalRupees,
        stock: p.stock,
      });
    }

    // Coupon discount calculation
    let discountCents = 0;
    if (couponCode && couponCode.trim()) {
      try {
        const coupon = await prisma.coupon.findUnique({
          where: { code: couponCode.trim().toUpperCase() },
        });

        if (
          coupon &&
          coupon.isActive &&
          (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
          (!coupon.minOrderCents || subtotalCents >= coupon.minOrderCents)
        ) {
          if (coupon.discountType === "PERCENTAGE") {
            discountCents = Math.round((subtotalCents * coupon.discountValue) / 100);
          } else {
            discountCents = coupon.discountValue;
          }
          if (coupon.maxDiscountCents && discountCents > coupon.maxDiscountCents) {
            discountCents = coupon.maxDiscountCents;
          }
        }
      } catch {}
    }

    const subtotalAfterDiscountCents = Math.max(0, subtotalCents - discountCents);
    const subtotalRupees = Math.round(subtotalCents / 100);
    const discountRupees = Math.round(discountCents / 100);

    // Shipping rules: Free over ₹4,999, else ₹99
    const shippingRupees = subtotalRupees > 4999 || subtotalRupees === 0 ? 0 : 99;
    const shippingCents = shippingRupees * 100;

    // 18% GST (Standard luxury goods GST in India)
    const taxCents = Math.round(subtotalAfterDiscountCents * 0.18);
    const taxRupees = Math.round(taxCents / 100);

    const totalCents = subtotalAfterDiscountCents + shippingCents + taxCents;
    const totalRupees = Math.round(totalCents / 100);

    return {
      items: calculatedItems,
      subtotal: subtotalRupees,
      discount: discountRupees,
      shipping: shippingRupees,
      tax: taxRupees,
      total: totalRupees,
      couponCode: discountCents > 0 ? couponCode : undefined,
      outOfStockItems,
    } as PricingCalculation;
  });

/**
 * Creates an authoritative pending Order with snapshot line items and delivery address in a database transaction.
 * Strictly requires an authenticated customer session.
 */
export const createOrderAndPaymentFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      name: string;
      email: string;
      phone: string;
      line1: string;
      line2?: string;
      city: string;
      region: string;
      postal: string;
      items: CartItemInput[];
      couponCode?: string;
      paymentProvider: "RAZORPAY" | "STRIPE" | "MANUAL";
    }) => d,
  )
  .handler(async ({ data }) => {
    const { name, email, phone, line1, line2, city, region, postal, items, couponCode, paymentProvider } = data;

    // Strict customer authentication check
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) {
      throw new Error("Authentication required. Please sign in to your patron account to complete checkout.");
    }

    const authUser = await getUserBySessionToken(token);
    if (!authUser || authUser.status !== "ACTIVE") {
      throw new Error("Valid customer authentication required. Please sign in.");
    }

    if (!name || !email || !phone || !line1 || !city || !postal) {
      throw new Error("Missing required customer information or delivery address.");
    }

    if (!items || items.length === 0) {
      throw new Error("Cart is empty.");
    }

    // Authoritatively calculate prices and verify stock against PostgreSQL
    const pricing = await calculateOrderPricingFn({ data: { items, couponCode } });
    if (pricing.outOfStockItems.length > 0) {
      throw new Error(`Inventory shortage: ${pricing.outOfStockItems.join(", ")}`);
    }

    // Unique sequential/random order number
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const orderNumber = `THK-${randomSuffix}`;

    const subtotalCents = Math.round(pricing.subtotal * 100);
    const discountCents = Math.round(pricing.discount * 100);
    const shippingCents = Math.round(pricing.shipping * 100);
    const taxCents = Math.round(pricing.tax * 100);
    const totalCents = Math.round(pricing.total * 100);

    // Call Razorpay API to create official order on gateway
    const razorpayOrder = await createRazorpayOrder({
      amountCents: totalCents,
      receipt: orderNumber,
      notes: { customerId: authUser.id, orderNumber },
    });

    // Execute atomic transaction
    const order = await prisma.$transaction(async (tx) => {
      // Find or create address for the authenticated user
      const address = await tx.address.create({
        data: {
          userId: authUser.id,
          name,
          phone,
          line1,
          line2: line2 || null,
          city,
          region,
          postal,
          country: "India",
        },
      });

      // Create Order belonging strictly to authUser.id
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: authUser.id,
          email: email.toLowerCase().trim(),
          phone,
          status: "PENDING",
          subtotalCents,
          discountCents,
          shippingCents,
          taxCents,
          totalCents,
          couponCode: pricing.couponCode || null,
          addressId: address.id,
          items: {
            create: pricing.items.map((item) => ({
              productId: item.productId,
              productName: item.name,
              productSlug: item.slug,
              productSku: item.sku,
              productImage: item.image,
              quantity: item.quantity,
              priceCents: Math.round(item.unitPrice * 100),
              subtotalCents: Math.round(item.lineTotal * 100),
            })),
          },
          payments: {
            create: {
              provider: "RAZORPAY",
              status: "PENDING",
              amountCents: totalCents,
              currency: "INR",
              reference: razorpayOrder.id,
            },
          },
        },
        include: {
          items: true,
          payments: true,
          address: true,
        },
      });

      // Increment coupon usage count if used
      if (pricing.couponCode) {
        await tx.coupon.update({
          where: { code: pricing.couponCode },
          data: { timesUsed: { increment: 1 } },
        }).catch(() => {});
      }

      // Clear the user's database cart after order creation
      await tx.cartItem.deleteMany({
        where: { userId: authUser.id },
      }).catch(() => {});

      return newOrder;
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalRupees: pricing.total,
      amountPaise: totalCents,
      currency: "INR",
      email: order.email,
      phone: order.phone,
      customerName: name,
      razorpayOrderId: razorpayOrder.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
    };
  });

/**
 * Confirms and captures payment using cryptographic signature verification.
 * Rejects any request without valid Razorpay HMAC-SHA256 signature.
 */
export const verifyAndCapturePaymentFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      orderId: string;
      razorpayPaymentId: string;
      razorpayOrderId: string;
      razorpaySignature: string;
      paymentMethod?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature, paymentMethod } = data;

    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) throw new Error("Authentication required.");

    const user = await getUserBySessionToken(token);
    if (!user) throw new Error("Authentication required.");

    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      throw new Error("Missing required payment verification parameters from gateway.");
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });

    if (!order) throw new Error("Order not found.");

    // Customer Isolation check: Order must belong to user or admin
    if (order.userId !== user.id && user.role !== "ADMIN") {
      throw new Error("Unauthorized access to this order.");
    }

    // Idempotency check: If already paid, do not re-capture or double-decrement stock
    if (order.status === "PAID" || order.status === "PROCESSING" || order.status === "SHIPPED") {
      return { success: true, orderNumber: order.orderNumber, alreadyPaid: true };
    }

    // Cryptographic signature verification with Razorpay Secret
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      throw new Error("Payment Gateway Error: Server configuration missing Razorpay Secret Key.");
    }

    const isValid = verifyRazorpayPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      keySecret,
    );

    if (!isValid) {
      console.error(
        `Invalid Razorpay signature for order ${order.orderNumber}: ${razorpayOrderId} / ${razorpayPaymentId}`,
      );
      throw new Error("Payment verification failed: Untrusted cryptographic signature from payment gateway.");
    }

    // Atomic stock reduction and status update
    await prisma.$transaction(async (tx) => {
      // 1. Mark order as PAID
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
        },
      });

      // 2. Mark payment as CAPTURED
      if (order.payments.length > 0) {
        await tx.payment.update({
          where: { id: order.payments[0].id },
          data: {
            status: "CAPTURED",
            transactionId: razorpayPaymentId,
            paymentMethod: paymentMethod || "Razorpay Gateway",
          },
        });
      }

      // 3. Deduct stock inventory for each item safely
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

      // 4. Create customer notification
      if (order.userId) {
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: `Order Confirmed: ${order.orderNumber}`,
            message: `Your payment of ₹${Math.round(order.totalCents / 100)} was verified. We are preparing your ritual artifacts.`,
            type: "ORDER",
            link: `/orders/${order.id}`,
          },
        });
      }

      // 5. Create audit log
      await tx.auditLog.create({
        data: {
          adminId: user.id,
          action: "PAYMENT_CAPTURED",
          entity: "Order",
          entityId: order.id,
          details: {
            orderNumber: order.orderNumber,
            razorpayPaymentId,
            razorpayOrderId,
            amountPaise: order.totalCents,
          },
        },
      }).catch(() => {});
    });

    return {
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
    };
  });

/**
 * Records payment failure when customer cancels or bank declines transaction.
 */
export const recordPaymentFailureFn = createServerFn({ method: "POST" })
  .validator((d: { orderId: string; reason?: string; errorCode?: string }) => d)
  .handler(async ({ data }) => {
    const { orderId, reason, errorCode } = data;
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) return { success: false };
    const user = await getUserBySessionToken(token);
    if (!user) return { success: false };

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order || (order.userId !== user.id && user.role !== "ADMIN")) {
      return { success: false };
    }

    if (order.payments.length > 0 && order.payments[0].status === "PENDING") {
      await prisma.payment.update({
        where: { id: order.payments[0].id },
        data: {
          status: "FAILED",
          errorDetails: reason || errorCode || "Payment cancelled or declined at gateway",
        },
      });
    }

    return { success: true };
  });

/**
 * Retrieves orders strictly for the authenticated customer.
 */
export const getCustomerOrdersFn = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) throw new Error("Authentication required.");

  const user = await getUserBySessionToken(token);
  if (!user) throw new Error("Authentication required.");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      payments: true,
      address: true,
    },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    date: o.createdAt.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    status: o.status,
    totalRupees: Math.round(o.totalCents / 100),
    itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
    items: o.items.map((i) => ({
      name: i.productName,
      slug: i.productSlug,
      image: i.productImage,
      quantity: i.quantity,
      priceRupees: Math.round(i.priceCents / 100),
    })),
    trackingNumber: o.trackingNumber,
    carrier: o.carrier,
  }));
});

/**
 * Retrieves order details by ID or orderNumber, with strict data isolation.
 */
export const getOrderDetailFn = createServerFn({ method: "GET" })
  .validator((idOrNumber: string) => idOrNumber)
  .handler(async ({ data: idOrNumber }) => {
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) throw new Error("Authentication required to view order details.");

    const user = await getUserBySessionToken(token);
    if (!user) throw new Error("Authentication required to view order details.");

    const order = await prisma.order.findFirst({
      where: {
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: {
        items: true,
        payments: true,
        address: true,
      },
    });

    if (!order) return null;

    // Strict customer isolation check: Customer A CANNOT view Customer B's order!
    if (order.userId !== user.id && user.role !== "ADMIN") {
      throw new Error("Access Denied: You do not have permission to view this order.");
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt.toISOString(),
      formattedDate: order.createdAt.toLocaleDateString("en-IN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      status: order.status,
      email: order.email,
      phone: order.phone,
      subtotalRupees: Math.round(order.subtotalCents / 100),
      discountRupees: Math.round(order.discountCents / 100),
      shippingRupees: Math.round(order.shippingCents / 100),
      taxRupees: Math.round(order.taxCents / 100),
      totalRupees: Math.round(order.totalCents / 100),
      couponCode: order.couponCode,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      address: order.address
        ? {
            name: order.address.name,
            phone: order.address.phone,
            line1: order.address.line1,
            line2: order.address.line2,
            city: order.address.city,
            region: order.address.region,
            postal: order.address.postal,
            country: order.address.country,
          }
        : null,
      items: order.items.map((i) => ({
        id: i.id,
        name: i.productName,
        slug: i.productSlug,
        sku: i.productSku,
        image: i.productImage || "/assets/hero-comb.jpg",
        quantity: i.quantity,
        priceRupees: Math.round(i.priceCents / 100),
        subtotalRupees: Math.round(i.subtotalCents / 100),
      })),
      payment: order.payments[0]
        ? {
            provider: order.payments[0].provider,
            status: order.payments[0].status,
            reference: order.payments[0].reference,
            transactionId: order.payments[0].transactionId,
          }
        : null,
    };
  });

/**
 * Retrieves the persistent database cart for an authenticated customer.
 */
export const getDatabaseCartFn = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) return [];

  const user = await getUserBySessionToken(token);
  if (!user) return [];

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: user.id },
    include: { product: true },
  });

  return cartItems.map((c) => ({
    slug: c.product.slug,
    quantity: c.quantity,
  }));
});

/**
 * Synchronizes / merges the customer's cart to PostgreSQL.
 */
export const syncDatabaseCartFn = createServerFn({ method: "POST" })
  .validator((items: CartItemInput[]) => items)
  .handler(async ({ data: items }) => {
    const token = getCookie(SESSION_COOKIE_NAME);
    if (!token) return { success: false, reason: "unauthenticated" };

    const user = await getUserBySessionToken(token);
    if (!user) return { success: false, reason: "unauthenticated" };

    await prisma.$transaction(async (tx) => {
      // Clear existing cart items
      await tx.cartItem.deleteMany({ where: { userId: user.id } });

      // Re-insert valid items
      for (const item of items) {
        const prod = await tx.product.findUnique({
          where: { slug: item.slug },
          select: { id: true },
        });
        if (prod && item.quantity > 0) {
          await tx.cartItem.create({
            data: {
              userId: user.id,
              productId: prod.id,
              quantity: item.quantity,
            },
          });
        }
      }
    });

    return { success: true };
  });

/**
 * Clears the customer's database cart upon checkout completion or manual clear.
 */
export const clearDatabaseCartFn = createServerFn({ method: "POST" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) return { success: true };

  const user = await getUserBySessionToken(token);
  if (!user) return { success: true };

  await prisma.cartItem.deleteMany({ where: { userId: user.id } });
  return { success: true };
});
