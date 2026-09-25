import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

async function main() {
  console.log("Seeding Thaksha database...");

  // 1. Categories
  const combsCategory = await prisma.category.upsert({
    where: { slug: "combs" },
    update: {
      name: "Combs",
      description: "Sculpted dual-tooth and wide-tooth artisanal neem combs.",
      sortOrder: 1,
    },
    create: {
      name: "Combs",
      slug: "combs",
      description: "Sculpted dual-tooth and wide-tooth artisanal neem combs.",
      sortOrder: 1,
    },
  });

  const travelCategory = await prisma.category.upsert({
    where: { slug: "travel" },
    update: {
      name: "Travel",
      description: "Pocket-profile travel combs housed in recycled linen sleeves.",
      sortOrder: 2,
    },
    create: {
      name: "Travel",
      slug: "travel",
      description: "Pocket-profile travel combs housed in recycled linen sleeves.",
      sortOrder: 2,
    },
  });

  const brushesCategory = await prisma.category.upsert({
    where: { slug: "brushes" },
    update: {
      name: "Brushes",
      description: "Solid paddle brushes for daily scalp circulation and grooming.",
      sortOrder: 3,
    },
    create: {
      name: "Brushes",
      slug: "brushes",
      description: "Solid paddle brushes for daily scalp circulation and grooming.",
      sortOrder: 3,
    },
  });

  // 2. Products
  const products = [
    {
      slug: "origin-neem-comb",
      name: "The Origin",
      tagline: "Signature sculpted neem comb",
      description:
        "A hand-finished dual-profile comb carved from seasoned neem and sealed with cold-pressed botanical oils. Designed for scalp stimulation and anti-static glide.",
      sku: "THK-ORG-NM-001",
      priceCents: 399900, // ₹3,999
      compareAtPriceCents: 519900, // ₹5,199
      stock: 42,
      status: "PUBLISHED",
      isFeatured: true,
      categoryId: combsCategory.id,
      benefits: [
        "Reduces hair breakage & split ends",
        "Soothes and stimulates scalp circulation",
        "Evenly distributes natural botanical oils",
        "100% biodegradable and sustainably harvested",
      ],
      specs: {
        Material: "Oil-treated natural seasoned neem wood",
        Finish: "Hand polished with cold-pressed oils",
        Profile: "Wide + fine dual tooth profile",
        Packaging: "Recycled linen sleeve & ritual box",
      },
      images: [
        { url: "/assets/hero-comb.jpg", alt: "The Origin Neem Comb front view", sortOrder: 0 },
        { url: "/assets/product-detangler.jpg", alt: "The Origin tooth detail", sortOrder: 1 },
      ],
    },
    {
      slug: "detangler-wide-tooth-comb",
      name: "The Detangler",
      tagline: "Wide-tooth ritual comb",
      description:
        "A wide-tooth silhouette for wet or dry hair, shaped to glide effortlessly without pull. Gently untangles knots while preventing tension on hair roots.",
      sku: "THK-DTG-NM-002",
      priceCents: 349900, // ₹3,499
      compareAtPriceCents: 429900,
      stock: 28,
      status: "PUBLISHED",
      isFeatured: true,
      categoryId: combsCategory.id,
      benefits: [
        "Safe for wet, conditioned hair",
        "Preserves natural curl patterns",
        "Low friction tooth design",
        "Naturally anti-static properties",
      ],
      specs: {
        Material: "Seasoned organic neem wood",
        Finish: "Satin botanical oil seal",
        Profile: "Wide tooth wave contour",
        Dispatch: "Ready to ship in 24 hours",
      },
      images: [
        { url: "/assets/product-detangler.jpg", alt: "The Detangler Comb", sortOrder: 0 },
        { url: "/assets/hero-comb.jpg", alt: "The Detangler in hand", sortOrder: 1 },
      ],
    },
    {
      slug: "nomad-travel-comb",
      name: "The Nomad",
      tagline: "Pocket-sized travel comb",
      description:
        "A compact daily carry comb with an organic linen protective sleeve for travel rituals. Sized for pockets, dopp kits, and carry-ons.",
      sku: "THK-NMD-NM-003",
      priceCents: 299900, // ₹2,999
      compareAtPriceCents: null,
      stock: 35,
      status: "PUBLISHED",
      isFeatured: false,
      categoryId: travelCategory.id,
      benefits: [
        "Travel-ready compact profile",
        "Fits comfortably in pockets or bags",
        "Protective natural linen sleeve included",
        "One-piece carved solid neem core",
      ],
      specs: {
        Material: "Seasoned mature neem wood",
        Finish: "Smoked botanical oil polish",
        Profile: "Balanced travel tooth spacing",
        Sleeve: "Unbleached organic linen",
      },
      images: [
        { url: "/assets/product-nomad.jpg", alt: "The Nomad travel comb with sleeve", sortOrder: 0 },
        { url: "/assets/hero-comb.jpg", alt: "The Nomad lifestyle", sortOrder: 1 },
      ],
    },
    {
      slug: "sovereign-neem-brush",
      name: "The Sovereign",
      tagline: "Full-form paddle brush",
      description:
        "A future brush form with a solid seasoned neem body and polished wooden bristles on an air-cushioned pad. Provides deep scalp acupressure and gentle grooming.",
      sku: "THK-SOV-NM-004",
      priceCents: 559900, // ₹5,599
      compareAtPriceCents: 699900,
      stock: 16,
      status: "PUBLISHED",
      isFeatured: true,
      categoryId: brushesCategory.id,
      benefits: [
        "Invigorating scalp acupressure massage",
        "Smooth contoured ergonomic paddle form",
        "Wooden bristles stimulate follicle health",
        "Durable heirloom lifetime craftsmanship",
      ],
      specs: {
        Material: "Solid seasoned neem body and wooden pins",
        Finish: "Deep therapeutic oil polish",
        Profile: "Full form paddle brush",
        Availability: "Limited production batches",
      },
      images: [
        { url: "/assets/product-brush.jpg", alt: "The Sovereign paddle brush", sortOrder: 0 },
        { url: "/assets/hero-comb.jpg", alt: "The Sovereign detail", sortOrder: 1 },
      ],
    },
  ];

  for (const item of products) {
    const { images, ...productData } = item;
    const product = await prisma.product.upsert({
      where: { slug: item.slug },
      update: productData,
      create: productData,
    });

    // Remove old images and re-add
    await prisma.productImage.deleteMany({ where: { productId: product.id } });
    for (const img of images) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: img.url,
          alt: img.alt,
          sortOrder: img.sortOrder,
        },
      });
    }
  }

  // 3. Coupons
  await prisma.coupon.upsert({
    where: { code: "THAKSHA10" },
    update: {
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderCents: 99900,
      isActive: true,
      description: "10% off on all ritual combs and brushes",
    },
    create: {
      code: "THAKSHA10",
      discountType: "PERCENTAGE",
      discountValue: 10,
      minOrderCents: 99900,
      isActive: true,
      description: "10% off on all ritual combs and brushes",
    },
  });

  await prisma.coupon.upsert({
    where: { code: "WELCOME500" },
    update: {
      discountType: "FIXED",
      discountValue: 50000, // ₹500
      minOrderCents: 299900, // Min ₹2,999
      isActive: true,
      description: "Flat ₹500 discount for new patrons",
    },
    create: {
      code: "WELCOME500",
      discountType: "FIXED",
      discountValue: 50000,
      minOrderCents: 299900,
      isActive: true,
      description: "Flat ₹500 discount for new patrons",
    },
  });

  // 4. Default Admin User
  const adminPasswordHash = hashPassword("AdminPassword@2026");
  const admin = await prisma.user.upsert({
    where: { email: "admin@thaksha.com" },
    update: {
      name: "Thaksha Administrator",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
    create: {
      email: "admin@thaksha.com",
      name: "Thaksha Administrator",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
  });

  // 5. Default Customer User
  const customerPasswordHash = hashPassword("Customer@2026");
  const customer = await prisma.user.upsert({
    where: { email: "customer@example.com" },
    update: {
      name: "Aarav Sharma",
      phone: "+91 98765 43210",
      role: "CUSTOMER",
      passwordHash: customerPasswordHash,
    },
    create: {
      email: "customer@example.com",
      name: "Aarav Sharma",
      phone: "+91 98765 43210",
      role: "CUSTOMER",
      passwordHash: customerPasswordHash,
    },
  });

  // Add default address for customer
  const existingAddress = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!existingAddress) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        name: "Aarav Sharma",
        phone: "+91 98765 43210",
        line1: "Flat 402, Lotus Residency, Indiranagar",
        city: "Bengaluru",
        region: "Karnataka",
        country: "India",
        postal: "560038",
        isDefault: true,
      },
    });
  }

  // 6. Store Settings
  await prisma.storeSetting.upsert({
    where: { key: "announcement_bar" },
    update: { value: "Complimentary shipping across India on orders above ₹4,999" },
    create: {
      key: "announcement_bar",
      value: "Complimentary shipping across India on orders above ₹4,999",
      description: "Top site announcement text",
    },
  });

  console.log("Seeding complete! Admin user: admin@thaksha.com (Password: AdminPassword@2026)");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
