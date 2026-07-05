import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import { Shell } from "@/components/Shell";
import { products } from "@/data/catalog";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Shop - Thaksha Neem Wood Rituals" },
      {
        name: "description",
        content: "Explore hand-carved neem wood combs and brushes by Thaksha.",
      },
    ],
  }),
  component: Shop,
});

function Shop() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");

  const categories = ["All", ...Array.from(new Set(products.map((product) => product.category)))];
  const visible = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const text = `${product.name} ${product.tagline} ${product.description}`.toLowerCase();
      return matchesCategory && text.includes(query.toLowerCase());
    });
    return filtered.sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      return products.indexOf(a) - products.indexOf(b);
    });
  }, [category, query, sort]);

  return (
    <Shell>
      <main>
        <header className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
          <span className="mb-6 block text-[11px] uppercase tracking-[0.3em] text-brand-sage">
            The Complete Collection
          </span>
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.02] text-brand-primary md:text-7xl">
            Every ritual, <span className="italic">gathered</span> in one place.
          </h1>
          <p className="mt-8 max-w-xl text-base leading-relaxed text-brand-primary/70">
            A scalable catalog surface with search, category filtering, sorting, persistent cart,
            wishlist, and product pages already wired.
          </p>
        </header>
        <section className="mx-auto max-w-7xl px-6 pb-12 md:px-10">
          <div className="grid gap-4 border-y border-brand-primary/10 py-5 md:grid-cols-[1fr_auto_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              className="bg-transparent py-3 text-sm text-brand-primary outline-none placeholder:text-brand-primary/40"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="bg-brand-cream py-3 text-sm text-brand-primary outline-none"
            >
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="bg-brand-cream py-3 text-sm text-brand-primary outline-none"
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price low to high</option>
              <option value="price-high">Price high to low</option>
            </select>
          </div>
        </section>
        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-x-8 gap-y-16 px-6 pb-32 md:grid-cols-2 md:px-10">
          {visible.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </section>
      </main>
    </Shell>
  );
}
