import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { ProductCard } from "@/components/ProductCard";
import { Shell } from "@/components/Shell";
import { products } from "@/data/catalog";

export const Route = createFileRoute("/search")({
  component: SearchPage,
});

function SearchPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const value = query.toLowerCase();
    return products.filter((product) =>
      `${product.name} ${product.tagline} ${product.description} ${product.category}`
        .toLowerCase()
        .includes(value),
    );
  }, [query]);

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <h1 className="font-serif text-6xl text-brand-primary">Search</h1>
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try neem, travel, brush..."
          className="mt-10 w-full border-b border-brand-primary/20 bg-transparent py-5 text-2xl text-brand-primary outline-none placeholder:text-brand-primary/30"
        />
        <div className="mt-8 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.2em] text-brand-primary/60">
          {["Neem comb", "Travel", "Scalp care", "Pre-order"].map((item) => (
            <button
              key={item}
              onClick={() => setQuery(item)}
              className="border border-brand-primary/10 px-4 py-2"
            >
              {item}
            </button>
          ))}
        </div>
        <section className="mt-14 grid gap-x-8 gap-y-16 md:grid-cols-2">
          {results.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </section>
      </main>
    </Shell>
  );
}
