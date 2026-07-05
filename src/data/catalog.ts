import heroComb from "@/assets/hero-comb.jpg";
import productBrush from "@/assets/product-brush.jpg";
import productDetangler from "@/assets/product-detangler.jpg";
import productNomad from "@/assets/product-nomad.jpg";

export type ProductStatus = "available" | "preorder" | "soon";

export type Product = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  price: number;
  compareAt?: number;
  status: ProductStatus;
  inventory: number;
  sku: string;
  category: string;
  color: string;
  size: string;
  image: string;
  gallery: string[];
  benefits: string[];
  specs: Record<string, string>;
};

export const products: Product[] = [
  {
    slug: "origin-neem-comb",
    name: "The Origin",
    tagline: "Signature sculpted neem comb",
    description:
      "A hand-finished dual-profile comb carved from seasoned neem and sealed with cold-pressed botanical oils.",
    price: 3999,
    compareAt: 5199,
    status: "available",
    inventory: 42,
    sku: "THK-ORG-NM-001",
    category: "Combs",
    color: "Natural Oaked Neem",
    size: "Dual tooth",
    image: heroComb,
    gallery: [heroComb, productDetangler, productNomad],
    benefits: ["Reduces breakage", "Soothes scalp", "Distributes natural oils", "Biodegradable"],
    specs: {
      Material: "Oil-treated natural neem wood",
      Finish: "Hand polished",
      Profile: "Wide + fine tooth",
      Packaging: "Recycled linen sleeve",
    },
  },
  {
    slug: "detangler-wide-tooth-comb",
    name: "The Detangler",
    tagline: "Wide-tooth ritual comb",
    description: "A wide-tooth silhouette for wet or dry hair, shaped to glide without pull.",
    price: 3499,
    status: "preorder",
    inventory: 18,
    sku: "THK-DTG-NM-002",
    category: "Combs",
    color: "Light Neem",
    size: "Wide tooth",
    image: productDetangler,
    gallery: [productDetangler, heroComb, productNomad],
    benefits: ["Wet hair friendly", "Curl preserving", "Low friction", "Naturally anti-static"],
    specs: {
      Material: "Seasoned neem wood",
      Finish: "Satin oil",
      Profile: "Wide tooth",
      Dispatch: "Pre-order batch",
    },
  },
  {
    slug: "nomad-travel-comb",
    name: "The Nomad",
    tagline: "Pocket-sized travel comb",
    description: "A compact daily carry comb with a smooth linen sleeve for travel rituals.",
    price: 2999,
    status: "preorder",
    inventory: 24,
    sku: "THK-NMD-NM-003",
    category: "Travel",
    color: "Smoked Neem",
    size: "Pocket",
    image: productNomad,
    gallery: [productNomad, heroComb, productDetangler],
    benefits: ["Travel ready", "Pocket profile", "Recycled sleeve", "One-piece carved body"],
    specs: {
      Material: "Seasoned neem wood",
      Finish: "Smoked oil",
      Profile: "Pocket comb",
      Sleeve: "Recycled linen",
    },
  },
  {
    slug: "sovereign-neem-brush",
    name: "The Sovereign",
    tagline: "Full-form paddle brush",
    description: "A future brush form with a solid neem body and polished lifetime hardware.",
    price: 5599,
    status: "soon",
    inventory: 0,
    sku: "THK-SOV-NM-004",
    category: "Brushes",
    color: "Deep Neem",
    size: "Paddle",
    image: productBrush,
    gallery: [productBrush, heroComb, productDetangler],
    benefits: ["Scalp massage", "Smooth paddle form", "Lifetime body", "Waitlist ready"],
    specs: {
      Material: "Solid neem body",
      Finish: "Deep oil polish",
      Profile: "Paddle brush",
      Availability: "Coming soon",
    },
  },
];

export const getProduct = (slug: string) => products.find((product) => product.slug === slug);

export const formatMoney = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
