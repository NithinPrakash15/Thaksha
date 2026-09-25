import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { prisma } from "./prisma";
import { getUserBySessionToken } from "./auth";

const SESSION_COOKIE_NAME = "thaksha_session";

async function verifyAdminCaller() {
  const token = getCookie(SESSION_COOKIE_NAME);
  if (!token) throw new Error("Unauthorized. Administrative authentication required.");

  const user = await getUserBySessionToken(token);
  if (!user || user.role !== "ADMIN") {
    throw new Error("Forbidden. Access restricted to authorized administrators.");
  }
  return user;
}

/**
 * Aggregates real business metrics from PostgreSQL.
 */
export const getAdminMetricsFn = createServerFn({ method: "GET" }).handler(async () => {
  await verifyAdminCaller();

  const [totalOrders, pendingOrders, deliveredOrders, totalCustomers, totalProducts, lowStockProducts, paidOrders] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { status: "PENDING" } }),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.product.count(),
      prisma.product.count({ where: { stock: { lte: 5 }, status: "PUBLISHED" } }),
      prisma.order.findMany({
        where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        select: { totalCents: true },
      }),
    ]);

  const totalRevenueCents = paidOrders.reduce((sum, o) => sum + o.totalCents, 0);
  const totalRevenueRupees = Math.round(totalRevenueCents / 100);

  // Recent 5 orders
  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    include: { user: { select: { name: true, email: true } }, items: true },
  });

  return {
    totalRevenueRupees,
    totalOrders,
    pendingOrders,
    deliveredOrders,
    totalCustomers,
    totalProducts,
    lowStockProducts,
    recentOrders: recentOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.user?.name || o.email,
      status: o.status,
      totalRupees: Math.round(o.totalCents / 100),
      itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
      date: o.createdAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
    })),
  };
});

/**
 * Fetches all products for the administrative table.
 */
export const getAdminProductsFn = createServerFn({ method: "GET" }).handler(async () => {
  await verifyAdminCaller();

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      category: true,
      images: { orderBy: { sortOrder: "asc" } },
      orderItems: { select: { quantity: true } },
    },
  });

  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });

  return {
    products: products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      sku: p.sku,
      priceRupees: Math.round(p.priceCents / 100),
      compareAtRupees: p.compareAtPriceCents ? Math.round(p.compareAtPriceCents / 100) : null,
      stock: p.stock,
      status: p.status,
      isFeatured: p.isFeatured,
      categoryName: p.category?.name || "Uncategorized",
      categoryId: p.categoryId,
      image: p.images[0]?.url || "/assets/hero-comb.jpg",
      totalSold: p.orderItems.reduce((sum, item) => sum + item.quantity, 0),
    })),
    categories: categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
  };
});

/**
 * Creates a new product in the database.
 */
export const createAdminProductFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      name: string;
      slug: string;
      tagline?: string;
      description: string;
      sku: string;
      priceRupees: number;
      compareAtRupees?: number;
      stock: number;
      categoryId?: string;
      status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
      isFeatured: boolean;
      imageUrl: string;
      benefits: string[];
    }) => d,
  )
  .handler(async ({ data }) => {
    const admin = await verifyAdminCaller();

    const priceCents = Math.round(data.priceRupees * 100);
    const compareAtPriceCents = data.compareAtRupees
      ? Math.round(data.compareAtRupees * 100)
      : null;

    const product = await prisma.product.create({
      data: {
        name: data.name,
        slug: data.slug.toLowerCase().trim().replace(/\s+/g, "-"),
        tagline: data.tagline || null,
        description: data.description,
        sku: data.sku.toUpperCase().trim(),
        priceCents,
        compareAtPriceCents,
        stock: data.stock,
        categoryId: data.categoryId || null,
        status: data.status,
        isFeatured: data.isFeatured,
        benefits: data.benefits,
        images: {
          create: [{ url: data.imageUrl || "/assets/hero-comb.jpg", alt: data.name, sortOrder: 0 }],
        },
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "CREATE_PRODUCT",
        entity: "Product",
        entityId: product.id,
        details: { name: product.name, sku: product.sku },
      },
    }).catch(() => {});

    return { success: true, product };
  });

/**
 * Updates an existing product.
 */
export const updateAdminProductFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      id: string;
      name: string;
      tagline?: string;
      description: string;
      priceRupees: number;
      compareAtRupees?: number;
      stock: number;
      categoryId?: string;
      status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
      isFeatured: boolean;
    }) => d,
  )
  .handler(async ({ data }) => {
    const admin = await verifyAdminCaller();

    const priceCents = Math.round(data.priceRupees * 100);
    const compareAtPriceCents = data.compareAtRupees
      ? Math.round(data.compareAtRupees * 100)
      : null;

    const updated = await prisma.product.update({
      where: { id: data.id },
      data: {
        name: data.name,
        tagline: data.tagline || null,
        description: data.description,
        priceCents,
        compareAtPriceCents,
        stock: data.stock,
        categoryId: data.categoryId || null,
        status: data.status,
        isFeatured: data.isFeatured,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_PRODUCT",
        entity: "Product",
        entityId: updated.id,
        details: { name: updated.name, priceRupees: data.priceRupees, stock: data.stock },
      },
    }).catch(() => {});

    return { success: true, updated };
  });

/**
 * Adjusts inventory stock quickly.
 */
export const updateInventoryStockFn = createServerFn({ method: "POST" })
  .validator((d: { productId: string; newStock: number }) => d)
  .handler(async ({ data }) => {
    const admin = await verifyAdminCaller();

    const p = await prisma.product.update({
      where: { id: data.productId },
      data: { stock: Math.max(0, data.newStock) },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_STOCK",
        entity: "Product",
        entityId: p.id,
        details: { newStock: p.stock },
      },
    }).catch(() => {});

    return { success: true, stock: p.stock };
  });

/**
 * Fetches all orders for the administrative management dashboard.
 */
export const getAdminOrdersFn = createServerFn({ method: "GET" }).handler(async () => {
  await verifyAdminCaller();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      address: true,
      payments: true,
      user: { select: { name: true, email: true, phone: true } },
    },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.user?.name || o.address?.name || "Guest Patron",
    email: o.email,
    phone: o.phone || o.address?.phone || "—",
    status: o.status,
    totalRupees: Math.round(o.totalCents / 100),
    itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
    items: o.items.map((i) => ({
      name: i.productName,
      sku: i.productSku,
      quantity: i.quantity,
      priceRupees: Math.round(i.priceCents / 100),
    })),
    address: o.address
      ? `${o.address.line1}, ${o.address.city}, ${o.address.region} - ${o.address.postal}`
      : "Not specified",
    paymentProvider: o.payments[0]?.provider || "MANUAL",
    paymentStatus: o.payments[0]?.status || "PENDING",
    trackingNumber: o.trackingNumber,
    carrier: o.carrier,
    date: o.createdAt.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  }));
});

/**
 * Updates order status, tracking number, carrier and notifies the customer.
 */
export const updateAdminOrderStatusFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      orderId: string;
      status: "PENDING" | "PAID" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
      trackingNumber?: string;
      carrier?: string;
      cancelledReason?: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const admin = await verifyAdminCaller();

    const order = await prisma.order.update({
      where: { id: data.orderId },
      data: {
        status: data.status,
        trackingNumber: data.trackingNumber || null,
        carrier: data.carrier || null,
        cancelledReason: data.cancelledReason || null,
      },
      include: { user: true },
    });

    // Notify customer
    if (order.userId) {
      await prisma.notification.create({
        data: {
          userId: order.userId,
          title: `Order Update: ${order.orderNumber}`,
          message: `Your order status has changed to ${data.status}.${
            data.trackingNumber ? ` Airway Bill / Tracking: ${data.trackingNumber} (${data.carrier || "BlueDart"})` : ""
          }`,
          type: "ORDER",
          link: `/orders/${order.id}`,
        },
      }).catch(() => {});
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_ORDER_STATUS",
        entity: "Order",
        entityId: order.id,
        details: { newStatus: data.status, trackingNumber: data.trackingNumber },
      },
    }).catch(() => {});

    return { success: true };
  });

/**
 * Fetches all registered patrons with statistics.
 */
export const getAdminCustomersFn = createServerFn({ method: "GET" }).handler(async () => {
  await verifyAdminCaller();

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: {
      orders: {
        where: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        select: { totalCents: true },
      },
      addresses: { take: 1 },
    },
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name || "Patron",
    email: c.email,
    phone: c.phone || c.addresses[0]?.phone || "—",
    ordersCount: c.orders.length,
    totalSpentRupees: Math.round(c.orders.reduce((sum, o) => sum + o.totalCents, 0) / 100),
    joinedDate: c.createdAt.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  }));
});

/**
 * Fetches coupons and allows creating new discounts.
 */
export const getAdminCouponsFn = createServerFn({ method: "GET" }).handler(async () => {
  await verifyAdminCaller();

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: "desc" },
  });

  return coupons.map((c) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    discountType: c.discountType,
    discountValue: c.discountValue,
    minOrderRupees: Math.round(c.minOrderCents / 100),
    timesUsed: c.timesUsed,
    isActive: c.isActive,
    expiresAt: c.expiresAt ? c.expiresAt.toISOString().split("T")[0] : null,
  }));
});

export const createAdminCouponFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      code: string;
      description?: string;
      discountType: "PERCENTAGE" | "FIXED";
      discountValue: number;
      minOrderRupees: number;
      usageLimit?: number;
    }) => d,
  )
  .handler(async ({ data }) => {
    const admin = await verifyAdminCaller();

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase().trim(),
        description: data.description || null,
        discountType: data.discountType,
        discountValue:
          data.discountType === "PERCENTAGE"
            ? data.discountValue
            : Math.round(data.discountValue * 100),
        minOrderCents: Math.round(data.minOrderRupees * 100),
        usageLimit: data.usageLimit || null,
        isActive: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "CREATE_COUPON",
        entity: "Coupon",
        entityId: coupon.id,
        details: { code: coupon.code },
      },
    }).catch(() => {});

    return { success: true, coupon };
  });

/**
 * Fetches audit logs.
 */
export const getAdminAuditLogsFn = createServerFn({ method: "GET" }).handler(async () => {
  await verifyAdminCaller();

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { adminUser: { select: { name: true, email: true } } },
  });

  return logs.map((l) => ({
    id: l.id,
    adminName: l.adminUser?.name || "System Admin",
    action: l.action,
    entity: l.entity,
    entityId: l.entityId,
    details: l.details,
    date: l.createdAt.toLocaleString("en-IN"),
  }));
});

/**
 * Fetches all reviews for administration and moderation.
 */
export const getAdminReviewsFn = createServerFn({ method: "GET" }).handler(async () => {
  await verifyAdminCaller();

  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { name: true, sku: true } },
      user: { select: { name: true, email: true } },
    },
  });

  return reviews.map((r) => ({
    id: r.id,
    productName: r.product.name,
    productSku: r.product.sku,
    patronName: r.user?.name || "Anonymous Patron",
    patronEmail: r.user?.email || "—",
    rating: r.rating,
    title: r.title,
    body: r.body,
    isVerified: r.isVerified,
    isApproved: r.isApproved,
    date: r.createdAt.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  }));
});

/**
 * Toggles approval or deletes an inappropriate review.
 */
export const moderateAdminReviewFn = createServerFn({ method: "POST" })
  .validator((d: { reviewId: string; action: "APPROVE" | "UNAPPROVE" | "DELETE" }) => d)
  .handler(async ({ data }) => {
    const admin = await verifyAdminCaller();

    if (data.action === "DELETE") {
      await prisma.review.delete({ where: { id: data.reviewId } });
    } else {
      await prisma.review.update({
        where: { id: data.reviewId },
        data: { isApproved: data.action === "APPROVE" },
      });
    }

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: `MODERATE_REVIEW_${data.action}`,
        entity: "Review",
        entityId: data.reviewId,
      },
    }).catch(() => {});

    return { success: true };
  });

const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  free_shipping_threshold: {
    value: "4999",
    description: "Cart subtotal threshold in Rupees for complimentary shipping.",
  },
  flat_shipping_rate: {
    value: "99",
    description: "Standard delivery fee in Rupees when below threshold.",
  },
  tax_rate_percent: {
    value: "18",
    description: "Applicable GST tax percentage for handcrafted grooming tools.",
  },
  announcement_banner: {
    value: "Complimentary artisanal shipping on all patron orders above ₹4,999 • Handcrafted from certified neem wood",
    description: "Top promotional announcement banner displayed across storefront.",
  },
  support_email: {
    value: "concierge@thaksha.com",
    description: "Official customer service and concierge email address.",
  },
  support_phone: {
    value: "+91 (0) 80 4123 4567",
    description: "Customer service telephone and WhatsApp helpline.",
  },
  brand_tagline: {
    value: "The Pinnacle of Neem Wood Grooming & Scalp Heritage",
    description: "Brand descriptor used across footers and invoices.",
  },
};

/**
 * Fetches all store settings, seeding defaults if not yet created.
 */
export const getAdminStoreSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  await verifyAdminCaller();

  const settings = await prisma.storeSetting.findMany({
    orderBy: { key: "asc" },
  });

  const settingMap = new Map(settings.map((s) => [s.key, s]));

  // Ensure all defaults exist
  const result: Array<{ id?: string; key: string; value: string; description: string; updatedAt?: string }> = [];

  for (const [key, meta] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = settingMap.get(key);
    if (existing) {
      result.push({
        id: existing.id,
        key: existing.key,
        value: existing.value,
        description: existing.description || meta.description,
        updatedAt: existing.updatedAt.toLocaleString("en-IN"),
      });
    } else {
      // Seed default in DB
      const created = await prisma.storeSetting.create({
        data: {
          key,
          value: meta.value,
          description: meta.description,
        },
      });
      result.push({
        id: created.id,
        key: created.key,
        value: created.value,
        description: created.description || meta.description,
        updatedAt: created.updatedAt.toLocaleString("en-IN"),
      });
    }
  }

  return result;
});

/**
 * Updates a store setting and logs the modification in AuditLog.
 */
export const updateAdminStoreSettingFn = createServerFn({ method: "POST" })
  .validator((d: { key: string; value: string; description?: string }) => d)
  .handler(async ({ data }) => {
    const admin = await verifyAdminCaller();

    const updated = await prisma.storeSetting.upsert({
      where: { key: data.key },
      create: {
        key: data.key,
        value: data.value,
        description: data.description,
      },
      update: {
        value: data.value,
        description: data.description,
      },
    });

    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        action: "UPDATE_STORE_SETTING",
        entity: "StoreSetting",
        entityId: updated.id,
        details: { key: data.key, newValue: data.value },
      },
    }).catch(() => {});

    return { success: true, setting: updated };
  });


