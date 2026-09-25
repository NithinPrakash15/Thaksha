import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import heroComb from "@/assets/hero-comb.jpg";
import productDetangler from "@/assets/product-detangler.jpg";
import productNomad from "@/assets/product-nomad.jpg";
import productBrush from "@/assets/product-brush.jpg";
import { ProductCard } from "@/components/ProductCard";
import { Shell } from "@/components/Shell";
import { getCatalogProductsFn, formatRupees, type DbProductSummary } from "@/lib/server-products";
import { addToCart } from "@/lib/store";
import { toast } from "sonner";
import { ShieldCheck, Sparkles, Truck, Award } from "lucide-react";

export const Route = createFileRoute("/")({
  loader: async () => {
    try {
      const data = await getCatalogProductsFn();
      return { products: data?.products || [] };
    } catch {
      return { products: [] };
    }
  },
  head: () => ({
    meta: [
      { title: "Thaksha — Artisanal Handcrafted Neem Wood Rituals" },
      {
        name: "description",
        content: "Discover sculpted dual-profile neem combs, scalp detanglers, and paddle brushes carved from seasoned organic neem wood.",
      },
      {
        property: "og:image",
        content: "https://thaksha-nithin23.vercel.app/og-hero.jpg",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: "The Origin Neem Comb",
          brand: { "@type": "Brand", name: "Thaksha" },
          description:
            "Hand-carved from oil-treated natural neem wood. Reduces breakage, soothes the scalp, and lasts a lifetime.",
          offers: {
            "@type": "Offer",
            price: "3999",
            priceCurrency: "INR",
            availability: "https://schema.org/InStock",
          },
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { products } = Route.useLoaderData();

  return (
    <Shell>
      <div className="min-h-screen bg-brand-cream text-brand-ink font-sans">
        <main>
          <Hero products={products} />
          <Marquee />
          <TrustIndicators />
          <ProductList products={products} />
          <Story />
          <Testimonial />
          <Newsletter />
        </main>
      </div>
    </Shell>
  );
}

function Hero({ products }: { products: DbProductSummary[] }) {
  const slides = products.length > 0 ? products : [
    {
      id: "1",
      slug: "origin-neem-comb",
      name: "The Origin",
      tagline: "Signature sculpted neem comb",
      description: "Crafted from premium oil-treated natural neem.",
      sku: "THK-001",
      price: 3999,
      stock: 42,
      category: "Combs",
      image: heroComb,
      status: "PUBLISHED" as const,
      isFeatured: true,
    },
  ];

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(
      () => setIdx((v) => (v + 1) % slides.length),
      4000,
    );
    return () => window.clearInterval(t);
  }, [slides.length]);

  const product = slides[idx] || slides[0];

  const imgBySlug: Record<string, string> = {
    "origin-neem-comb": heroComb,
    "detangler-wide-tooth-comb": productDetangler,
    "nomad-travel-comb": productNomad,
    "sovereign-neem-brush": productBrush,
  };
  const heroImage = product?.slug && imgBySlug[product.slug] ? imgBySlug[product.slug] : product.image || heroComb;

  const handleHeroAdd = () => {
    if (product.stock <= 0) {
      toast.error(`${product.name} is currently out of stock.`);
      return;
    }
    addToCart(
      {
        slug: product.slug,
        name: product.name,
        price: product.price,
        description: product.description,
        image: heroImage,
        tagline: product.tagline || "",
        status: "available",
        inventory: product.stock,
        sku: product.sku,
        category: product.category,
        color: "Natural",
        size: "Standard",
        gallery: [heroImage],
        benefits: [],
        specs: {},
      },
      1,
    );
    toast.success(`${product.name} added to cart.`);
  };

  return (
    <section
      id="top"
      className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-20 pt-12 md:px-10 lg:grid-cols-12"
    >
      <div className="order-2 lg:order-1 lg:col-span-5">
        <span className="mb-4 inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
          100% Seasoned Neem Wood
        </span>
        <h1 className="mb-6 font-serif text-5xl leading-[0.95] tracking-tight text-brand-primary md:text-7xl lg:text-[5.5rem]">
          {product.name}
          <br />
          <span className="italic font-normal">Sculpted</span> Ritual
        </h1>
        <p className="mb-8 max-w-md text-base md:text-lg leading-relaxed text-brand-primary/75">
          {product.tagline || "Handcrafted from seasoned mature neem wood and cured with cold-pressed botanical oils for scalp health and anti-static glide."}
        </p>

        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={handleHeroAdd}
            className="bg-brand-primary px-8 py-4 text-[11px] uppercase tracking-[0.22em] text-brand-cream transition-all duration-300 hover:bg-brand-oak"
          >
            {`Add to Bag — ${formatRupees(product.price)}`}
          </button>
          <Link
            to="/product/$slug"
            params={{ slug: product.slug }}
            className="border-b border-brand-primary/30 px-1 py-4 text-[11px] uppercase tracking-[0.22em] text-brand-primary transition-colors hover:border-brand-oak hover:text-brand-oak"
          >
            Explore Specifications →
          </Link>
        </div>

        {slides.length > 1 && (
          <div className="mt-8 flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.slug}
                onClick={() => setIdx(i)}
                aria-label={`Show slide ${i + 1}`}
                className={`h-2.5 transition-all rounded-full ${
                  i === idx ? "w-8 bg-brand-oak" : "w-2.5 bg-brand-primary/20"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="order-1 lg:order-2 lg:col-span-7">
        <div className="relative aspect-[4/5] w-full overflow-hidden border border-brand-primary/10 shadow-lg bg-brand-sage-soft/20">
          <img
            src={heroImage}
            alt={product.name}
            className="h-full w-full object-cover transition-all duration-700"
          />
          <div className="absolute bottom-6 right-6 border border-brand-primary/10 bg-brand-cream/95 p-5 shadow-xl md:bottom-8 md:right-8 md:p-6 backdrop-blur-sm">
            <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-brand-sage font-medium">
              Heirloom Creation
            </p>
            <p className="font-serif text-xl italic text-brand-primary">
              {product.name}
            </p>
          </div>

          <div className="absolute left-6 top-6 flex size-24 items-center justify-center rounded-full border border-brand-primary/10 bg-brand-cream/90 text-center md:size-28 shadow-sm">
            <div>
              <p className="font-serif text-lg italic leading-none text-brand-primary">100%</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-brand-sage">
                Natural Neem
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Marquee() {
  const items = [
    "Sustainably Harvested",
    "Seasoned Mature Neem",
    "Static-Free Grooming",
    "Anti-Breakage Profile",
    "Cold-Pressed Botanical Oil Finish",
    "Lifetime Form Guarantee",
  ];
  return (
    <section
      aria-hidden="true"
      className="border-y border-brand-primary/10 bg-brand-primary py-4 text-brand-cream"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 text-[10px] uppercase tracking-[0.28em] md:gap-x-12">
        {items.map((t) => (
          <span key={t} className="flex items-center gap-2">
            <span className="text-brand-sage">✦</span> {t}
          </span>
        ))}
      </div>
    </section>
  );
}

function TrustIndicators() {
  const points = [
    { title: "Pan-India Express Dispatch", desc: "Shipped within 24 hours via premium air courier partners.", icon: Truck },
    { title: "Lifetime Form Guarantee", desc: "Seasoned solid wood carved to endure without warping.", icon: ShieldCheck },
    { title: "Scalp Wellness Proven", desc: "Rounded wood teeth stimulate circulation and distribute natural sebum.", icon: Sparkles },
    { title: "Authentic Craftsmanship", desc: "Each piece individually polished and inspected before boxing.", icon: Award },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-12 md:px-10 border-b border-brand-primary/10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {points.map((p, i) => {
          const Icon = p.icon;
          return (
            <div key={i} className="flex gap-4 items-start">
              <div className="p-3 bg-brand-primary/5 rounded border border-brand-primary/10 text-brand-oak flex-shrink-0">
                <Icon size={20} />
              </div>
              <div>
                <h4 className="font-serif text-lg text-brand-primary">{p.title}</h4>
                <p className="mt-1 text-xs text-brand-primary/65 leading-relaxed">{p.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ProductList({ products }: { products: DbProductSummary[] }) {
  return (
    <section id="product" className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
      <header className="mb-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <span className="mb-3 block text-[11px] uppercase tracking-[0.3em] text-brand-sage font-medium">
            Live Collection
          </span>
          <h2 className="max-w-3xl font-serif text-4xl md:text-5xl leading-tight text-brand-primary">
            Every ritual, <span className="italic font-normal">crafted</span> for your daily care.
          </h2>
        </div>
        <Link
          to="/shop"
          className="text-xs uppercase tracking-[0.2em] text-brand-primary hover:text-brand-oak border-b border-brand-primary/30 pb-1 self-start"
        >
          View Full Catalog ({products.length}) →
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </section>
  );
}

function Story() {
  return (
    <section className="bg-brand-cream/60 border-y border-brand-primary/10 px-6 py-20 md:px-10">
      <div className="mx-auto max-w-4xl text-center space-y-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
          The Craft of Neem
        </span>
        <h2 className="font-serif text-4xl md:text-5xl text-brand-primary leading-tight">
          Rooted in ancient botanicals. Shaped for modern rituals.
        </h2>
        <p className="text-base text-brand-primary/75 leading-relaxed max-w-2xl mx-auto">
          Unlike brittle injection-molded plastics that create static friction and tear hair cuticles, seasoned neem wood is naturally antimicrobial, low-friction, and smooth. With every stroke, our combs massage the scalp and distribute vital sebum oils from root to tip.
        </p>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-20 md:px-10">
      <div className="border border-brand-primary/10 p-10 md:p-16 bg-brand-cream/40 text-center max-w-3xl mx-auto">
        <p className="font-serif text-2xl md:text-3xl text-brand-primary italic leading-relaxed">
          "The Origin comb completely changed my evening hair routine. The weight in the hand feels grounding, and there is zero static even in dry weather."
        </p>
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-brand-sage font-medium">
          Priya Nambiar • Verified Patron
        </p>
      </div>
    </section>
  );
}

function Newsletter() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      toast.success("Thank you for joining our ritual circle.");
    }
  };

  return (
    <section className="border-t border-brand-primary/10 px-6 py-20 md:px-10 text-center">
      <div className="mx-auto max-w-xl space-y-4">
        <span className="text-[11px] uppercase tracking-[0.3em] text-brand-sage font-medium">
          Ritual Circle
        </span>
        <h2 className="font-serif text-4xl text-brand-primary">Join the Thaksha Gazette</h2>
        <p className="text-sm text-brand-primary/70">
          Receive seasonal dispatch notes, wood aging insights, and early access to limited batch releases.
        </p>

        {subscribed ? (
          <p className="text-sm text-green-800 font-semibold pt-4">You are now part of our ritual circle.</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto pt-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 border border-brand-primary/20 bg-transparent p-3.5 text-xs outline-none focus:border-brand-oak"
            />
            <button
              type="submit"
              className="bg-brand-primary text-brand-cream px-6 py-3.5 text-[10px] uppercase tracking-[0.2em] hover:bg-brand-oak transition-colors"
            >
              Subscribe
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
