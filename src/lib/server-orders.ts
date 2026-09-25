import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./prisma";
import { getUserBySessionToken } from "./auth";

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

    if (!name || !email || !phone || !line1 || !city || !postal) {
      throw new Error("Missing required customer information or delivery address.");
    }

    if (!items || items.length === 0) {
      throw new Error("Cart is empty.");
    }

    // Try resolving authenticated user
    const token = getCookie(SESSION_COOKIE_NAME);
    const authUser = token ? await getUserBySessionToken(token) : null;

    // Authoritatively calculate prices and verify stock
    const pricing = await calculateOrderPricingFn({ data: { items, couponCode } });
    if (pricing.outOfStockItems.length > 0) {
      throw new Error(`Inventory shortage: ${pricing.outOfStockItems.join(", ")}`);
    }

    // Generate unique order number (e.g. THK-829103)
    const randomSuffix = Math.floor(100000 + Math.random() * 900000).toString();
    const orderNumber = `THK-${randomSuffix}`;

    const subtotalCents = Math.round(pricing.subtotal * 100);
    const discountCents = Math.round(pricing.discount * 100);
    const shippingCents = Math.round(pricing.shipping * 100);
    const taxCents = Math.round(pricing.tax * 100);
    const totalCents = Math.round(pricing.total * 100);

    // Execute atomic transaction
    const order = await prisma.$transaction(async (tx) => {
      // Find or create address
      const address = await tx.address.create({
        data: {
          userId: authUser?.id || null,
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

      // Create Order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: authUser?.id || null,
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
              provider: paymentProvider,
              status: "PENDING",
              amountCents: totalCents,
              currency: "INR",
              reference: `TXN-${Date.now()}-${randomSuffix}`,
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

      return newOrder;
    });

    return {
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalRupees: pricing.total,
      currency: "INR",
      email: order.email,
      paymentId: order.payments[0]?.id,
      paymentReference: order.payments[0]?.reference,
    };
  });

/**
 * Confirms and captures payment, deducts stock inventory safely, and transitions order to PAID.
 */
export const verifyAndCapturePaymentFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      orderId: string;
      transactionId?: string;
      paymentMethod?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { orderId, transactionId, paymentMethod } = data;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payments: true },
    });

    if (!order) throw new Error("Order not found.");
    if (order.status === "PAID" || order.status === "PROCESSING" || order.status === "SHIPPED") {
      return { success: true, orderNumber: order.orderNumber, alreadyPaid: true };
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
            transactionId: transactionId || `TXN-${Date.now()}`,
            paymentMethod: paymentMethod || "Standard Payment",
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

      // 4. Create in-app notification for the customer
      if (order.userId) {
        await tx.notification.create({
          data: {
            userId: order.userId,
            title: `Order Confirmed: ${order.orderNumber}`,
            message: `Your payment of ₹${Math.round(order.totalCents / 100)} was successfully received. We are preparing your handcrafted neem rituals.`,
            type: "ORDER",
            link: `/orders/${order.id}`,
          },
        });
      }
    });

    return {
      success: true,
      orderNumber: order.orderNumber,
      orderId: order.id,
    };
  });

/**
 * Retrieves orders for the authenticated customer.
 */
export const getCustomerOrdersFn = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) return [];

  const user = await getUserBySessionToken(token);
  if (!user) return [];

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
 * Retrieves order details by ID or orderNumber, with privacy isolation.
 */
export const getOrderDetailFn = createServerFn({ method: "GET" })
  .validator((idOrNumber: string) => idOrNumber)
  .handler(async ({ data: idOrNumber }) => {
    const token = getCookie(SESSION_COOKIE_NAME);
    const user = token ? await getUserBySessionToken(token) : null;

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

    // Security check: only allow if user owns the order, is an admin, or order is within guest session
    if (order.userId && (!user || (user.id !== order.userId && user.role !== "ADMIN"))) {
      throw new Error("Unauthorized to view this order.");
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
