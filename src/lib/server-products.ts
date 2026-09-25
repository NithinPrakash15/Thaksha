import { createServerFn } from "@tanstack/react-start";
import { prisma } from "./prisma";

export type DbProductSummary = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string;
  sku: string;
  price: number; // in INR
  compareAt?: number;
  stock: number;
  category: string;
  image: string;
  status: "PUBLISHED" | "DRAFT" | "ARCHIVED";
  isFeatured: boolean;
};

export type DbProductDetail = DbProductSummary & {
  benefits: string[];
  specs: Record<string, string>;
  gallery: string[];
  reviews: Array<{
    id: string;
    rating: number;
    title: string;
    body: string;
    createdAt: string;
    userName: string;
    isVerified: boolean;
  }>;
};

/**
 * Formats rupee amount from cents or whole rupees.
 */
export const formatRupees = (rupees: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);

/**
 * Fetches published products for shop catalog.
 */
export const getCatalogProductsFn = createServerFn({ method: "GET" })
  .validator((d?: { category?: string; sort?: string; query?: string }) => d || {})
  .handler(async ({ data }) => {
    const { category, sort, query } = data || {};

    const where: any = {
      status: "PUBLISHED",
    };

    if (category && category !== "All") {
      where.category = {
        name: { equals: category, mode: "insensitive" },
      };
    }

    if (query && query.trim()) {
      const q = query.trim();
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { tagline: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ];
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "price-low") orderBy = { priceCents: "asc" };
    if (sort === "price-high") orderBy = { priceCents: "desc" };
    if (sort === "featured") orderBy = [{ isFeatured: "desc" }, { createdAt: "desc" }];

    const [products, categories] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        include: {
          category: true,
          images: { orderBy: { sortOrder: "asc" } },
        },
      }),
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        select: { name: true, slug: true },
      }),
    ]);

    const formatted: DbProductSummary[] = products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      sku: p.sku,
      price: Math.round(p.priceCents / 100),
      compareAt: p.compareAtPriceCents ? Math.round(p.compareAtPriceCents / 100) : undefined,
      stock: p.stock,
      category: p.category?.name || "Rituals",
      image: p.images[0]?.url || "/assets/hero-comb.jpg",
      status: p.status,
      isFeatured: p.isFeatured,
    }));

    return {
      products: formatted,
      categories: ["All", ...categories.map((c) => c.name)],
    };
  });

/**
 * Fetches a single product with full gallery, specs, benefits, and reviews by slug.
 */
export const getProductBySlugFn = createServerFn({ method: "GET" })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const p = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: "desc" },
          include: { user: { select: { name: true } } },
        },
      },
    });

    if (!p) return null;

    const gallery = p.images.length > 0
      ? p.images.map((img) => img.url)
      : ["/assets/hero-comb.jpg"];

    const specs = (typeof p.specs === "object" && p.specs !== null ? p.specs : {}) as Record<
      string,
      string
    >;

    const detail: DbProductDetail = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      sku: p.sku,
      price: Math.round(p.priceCents / 100),
      compareAt: p.compareAtPriceCents ? Math.round(p.compareAtPriceCents / 100) : undefined,
      stock: p.stock,
      category: p.category?.name || "Rituals",
      image: gallery[0],
      gallery,
      benefits: p.benefits,
      specs,
      status: p.status,
      isFeatured: p.isFeatured,
      reviews: p.reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.createdAt.toLocaleDateString("en-IN", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
        userName: r.user?.name || "Patron",
        isVerified: r.isVerified,
      })),
    };

    return detail;
  });

/**
 * Search products with query, returning matches.
 */
export const searchProductsFn = createServerFn({ method: "GET" })
  .validator((query: string) => query)
  .handler(async ({ data: query }) => {
    if (!query || !query.trim()) return [];

    const q = query.trim();
    const products = await prisma.product.findMany({
      where: {
        status: "PUBLISHED",
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { tagline: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
      },
      take: 20,
    });

    return products.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      sku: p.sku,
      price: Math.round(p.priceCents / 100),
      compareAt: p.compareAtPriceCents ? Math.round(p.compareAtPriceCents / 100) : undefined,
      stock: p.stock,
      category: p.category?.name || "Rituals",
      image: p.images[0]?.url || "/assets/hero-comb.jpg",
      status: p.status,
      isFeatured: p.isFeatured,
    })) as DbProductSummary[];
  });

/**
 * Submits a customer review for a product with verified purchase validation.
 */
export const submitProductReviewFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      productId: string;
      rating: number;
      title: string;
      body: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    const { getCookie } = await import("@tanstack/react-start/server");
    const { getUserBySessionToken } = await import("./auth");

    const token = getCookie("thaksha_session");
    if (!token) throw new Error("Please sign in to submit a review.");

    const user = await getUserBySessionToken(token);
    if (!user) throw new Error("Please sign in to submit a review.");

    if (data.rating < 1 || data.rating > 5) {
      throw new Error("Rating must be between 1 and 5 stars.");
    }

    if (!data.title.trim() || !data.body.trim()) {
      throw new Error("Review title and impressions cannot be empty.");
    }

    // Check if user has purchased this product
    const confirmedOrder = await prisma.order.findFirst({
      where: {
        userId: user.id,
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] },
        items: { some: { productId: data.productId } },
      },
    });

    const isVerified = Boolean(confirmedOrder);

    const review = await prisma.review.create({
      data: {
        productId: data.productId,
        userId: user.id,
        rating: Math.round(data.rating),
        title: data.title.trim(),
        body: data.body.trim(),
        isVerified,
        isApproved: true, // Visible immediately
      },
    });

    return { success: true, reviewId: review.id, isVerified };
  });

