import { createFileRoute } from "@tanstack/react-router";
import heroComb from "@/assets/hero-comb.jpg";
import { useEffect, useState } from "react";
import productDetangler from "@/assets/product-detangler.jpg";
import productNomad from "@/assets/product-nomad.jpg";
import productBrush from "@/assets/product-brush.jpg";
import { products } from "@/data/catalog";
import { addToCart, toggleWishlist } from "@/lib/store";
import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        property: "og:image",
        content:
          "https://id-preview--6b19fff4-eef4-423f-ae3e-b40bfe693ae1.lovable.app/og-hero.jpg",
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
  return (
    <Shell>
      <div className="min-h-screen bg-brand-cream text-brand-ink font-sans">
        <Nav />
        <main>
          <Hero />
          <Marquee />
          <ProductList />
          <Story />
          <Testimonial />
          <Newsletter />
        </main>
      </div>
    </Shell>
  );
}

function Nav() {
  // Reuse the existing header/footer from Shell.
  // Shell already renders its own <nav> and <footer>.
  return null;
}

function Hero() {
  const slides = [products[0], products[1], products[2], products[3]].filter(Boolean);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = window.setInterval(
      () => setIdx((v) => (v + 1) % slides.length),
      3500,
    );
    return () => window.clearInterval(t);
  }, [slides.length]);

  const product = slides[idx];
  const imgBySlug: Record<string, string> = {
    "origin-neem-comb": heroComb,
    "detangler-wide-tooth-comb": productDetangler,
    "nomad-travel-comb": productNomad,
    "sovereign-neem-brush": productBrush,
  };
  const img = imgBySlug[product.slug] ?? heroComb;

  return (
    <section
      id="top"
      className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 pb-24 pt-12 md:px-10 lg:grid-cols-12"
    >
      <div className="order-2 animate-reveal lg:order-1 lg:col-span-5">
        <span className="mb-6 inline-block text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
          100% Natural Neem Wood
        </span>
        <h1 className="mb-8 font-serif text-6xl leading-[0.9] tracking-tight text-brand-primary md:text-7xl lg:text-[6.5rem]">
          The Origin
          <br />
          <span className="italic">Sculpted</span> Comb
        </h1>
        <p className="mb-10 max-w-md text-lg leading-relaxed text-brand-primary/70">
          Crafted from premium oil-treated natural neem. A ritual for your scalp, a commitment to
          the earth.
        </p>
        <div className="flex flex-wrap gap-4 items-center">
          <button
            onClick={() => addToCart(product)}
            className="bg-brand-primary px-10 py-5 text-[11px] uppercase tracking-[0.22em] text-brand-cream transition-all duration-500 hover:bg-brand-oak"
          >
            {`Add — ₹${product.price}`}
          </button>
          <a
            href="/shop"
            className="border-b border-brand-primary/30 px-1 py-5 text-[11px] uppercase tracking-[0.22em] text-brand-primary transition-colors hover:border-brand-oak hover:text-brand-oak"
          >
            View more
          </a>
        </div>

        <div className="mt-6 flex items-center gap-2">
          {slides.map((s, i) => (
            <button
              key={s.slug}
              onClick={() => setIdx(i)}
              aria-label={`Show slide ${i + 1}`}
              className={`h-2.5 w-2.5 rounded-full ${
                i === idx ? "bg-brand-oak" : "bg-brand-primary/20"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="order-1 animate-reveal lg:order-2 lg:col-span-7">
        <div className="relative aspect-[4/5] w-full overflow-hidden">
          <img
            src={img}
            alt={product?.name ? `${product.name} product image` : "Thaksha product"}
            width={1200}
            height={1504}
            className="h-full w-full object-cover"
          />
          <div className="absolute bottom-6 right-6 border border-brand-primary/5 bg-brand-cream p-5 shadow-xl md:bottom-8 md:right-8 md:p-6">
            <p className="mb-1 text-[10px] uppercase tracking-[0.22em] text-brand-sage">
              Featured Product
            </p>
            <p className="font-serif text-xl italic text-brand-primary">
              {product?.name ?? "Thaksha"}
            </p>
          </div>
          <div className="absolute left-6 top-6 flex size-24 items-center justify-center rounded-full border border-brand-primary/10 bg-brand-cream/90 text-center md:size-28">
            <div>
              <p className="font-serif text-lg italic leading-none text-brand-primary">100%</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.2em] text-brand-sage">
                Natural &amp; Eco
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
    "Sustainable",
    "Eco Friendly",
    "Durable",
    "Daily Care",
    "Oil Treated",
    "Handcrafted",
  ];
  return (
    <section
      aria-hidden="true"
      className="border-y border-brand-primary/10 bg-brand-primary py-5 text-brand-cream"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-2 px-6 text-[10px] uppercase tracking-[0.32em] md:gap-x-14">
        {items.map((t) => (
          <span key={t} className="flex items-center gap-3">
            <span className="text-brand-sage">✦</span> {t}
          </span>
        ))}
      </div>
    </section>
  );
}

function ProductList() {
  return (
    <section id="product" className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
      <header className="mb-12">
        <span className="mb-4 block text-[11px] uppercase tracking-[0.3em] text-brand-sage">
          Shop the Collection
        </span>
        <h2 className="max-w-4xl font-serif text-5xl leading-[1.02] text-brand-primary md:text-6xl">
          Every ritual, <span className="italic">gathered</span> for your shelf.
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-primary/70">
          Add to cart, wishlist, or open details—no need to press the Shop button.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        {products.map((product) => (
          <article key={product.slug} className="group">
            <div className="relative mb-5 aspect-[4/5] overflow-hidden bg-brand-sage-soft/30">
              <img
                src={product.image}
                alt={product.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <span className="absolute left-4 top-4 bg-brand-cream/95 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-brand-primary">
                {product.status === "available"
                  ? "In Stock"
                  : product.status === "preorder"
                    ? "Pre-order"
                    : "Soon"}
              </span>
            </div>

            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-serif text-3xl italic text-brand-primary">{product.name}</h3>
                <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-brand-sage">
                  {product.tagline}
                </p>
              </div>
              <p className="font-serif text-2xl text-brand-primary">₹{product.price}</p>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-brand-primary/65">{product.description}</p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  if (product.status === "soon") {
                    toggleWishlist(product.slug);
                    window.alert(`${product.name} added to your waitlist.`);
                    return;
                  }
                  addToCart(product);
                }}
                className="inline-flex items-center gap-2 border-b border-brand-primary/25 pb-1 text-[11px] uppercase tracking-[0.22em] text-brand-primary hover:text-brand-oak disabled:opacity-40"
              >
                Add
              </button>

              <button
                onClick={() => toggleWishlist(product.slug)}
                className="inline-flex items-center gap-2 border-b border-brand-primary/25 pb-1 text-[11px] uppercase tracking-[0.22em] text-brand-primary hover:text-brand-oak"
              >
                Wishlist
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Story() {
  return (
    <section id="story" className="bg-brand-primary py-24 text-brand-cream md:py-32">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 md:px-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <span className="mb-6 block text-[11px] uppercase tracking-[0.3em] text-brand-sage">
            Our Origin
          </span>
          <h2 className="mb-8 font-serif text-5xl leading-[1.05] md:text-6xl">
            Rooted in tradition,
            <br />
            <span className="italic">crafted</span> for today.
          </h2>
        </div>
        <div className="space-y-8 text-brand-cream/80 lg:col-span-7">
          <p className="text-lg leading-relaxed">
            Thaksha began with a simple observation — modern hair care had lost its tactile
            connection to nature. We revive the wisdom of the neem tree, an ingredient revered in
            Ayurveda for millennia, and pair it with the discipline of contemporary craft.
          </p>
          <p className="leading-relaxed text-brand-cream/60">
            Every comb is seasoned for twelve months, hand-carved by a small studio of artisans, and
            finished with cold-pressed oils. What arrives at your door is not a mass-produced
            accessory. It is a quiet, honest object made to last a lifetime.
          </p>
          <div className="flex flex-wrap gap-10 pt-6">
            {[
              { k: "12 mo", v: "Timber seasoning" },
              { k: "100%", v: "Biodegradable" },
              { k: "1 of 1", v: "Grain signature" },
            ].map((s) => (
              <div key={s.k}>
                <div className="font-serif text-4xl text-brand-cream">{s.k}</div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.22em] text-brand-sage">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="border-y border-brand-primary/10 bg-brand-sage-soft/30 py-24 md:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center md:px-10">
        <div className="mb-8 text-brand-oak">
          <span className="text-2xl">✧</span>
        </div>
        <blockquote className="font-serif text-3xl italic leading-relaxed text-brand-primary md:text-4xl">
          &ldquo;There is a quiet weight to this comb that changes how I begin the day. It feels
          less like grooming and more like a grounding ceremony.&rdquo;
        </blockquote>
        <cite className="mt-10 block text-[11px] not-italic uppercase tracking-[0.3em] text-brand-primary/60">
          Ananya R. — Bengaluru
        </cite>
      </div>
    </section>
  );
}

function Newsletter() {
  return (
    <section id="journal" className="mx-auto max-w-7xl px-6 py-24 md:px-10 md:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mb-4 block text-[11px] uppercase tracking-[0.3em] text-brand-sage">
          The Journal
        </span>
        <h2 className="mb-6 font-serif text-4xl leading-tight text-brand-primary md:text-5xl">
          Slow living, <span className="italic">delivered</span> seasonally.
        </h2>
        <p className="mb-10 text-brand-primary/70">
          Join our community for botanical care guides, artisan interviews, and exclusive first
          access to new releases.
        </p>
        <form
          className="mx-auto flex max-w-md items-center gap-4 border-b border-brand-primary/30 pb-2"
          onSubmit={(e) => {
            e.preventDefault();
            window.alert("Thank you. You are subscribed to Thaksha Journal updates.");
          }}
        >
          <input
            type="email"
            required
            placeholder="Your email address"
            className="flex-1 bg-transparent py-3 text-sm text-brand-primary placeholder:text-brand-primary/40 focus:outline-none"
          />
          <button
            type="submit"
            className="text-[11px] font-semibold uppercase tracking-[0.25em] text-brand-primary transition-colors hover:text-brand-oak"
          >
            Subscribe →
          </button>
        </form>
      </div>
    </section>
  );
}

