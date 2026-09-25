import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Shell } from "@/components/Shell";
import { getCatalogProductsFn, type DbProductSummary } from "@/lib/server-products";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Complete Ritual Collection — Thaksha" },
      {
        name: "description",
        content: "Explore hand-carved neem wood combs, travel tools, and solid paddle brushes by Thaksha.",
      },
    ],
  }),
  loader: async () => {
    try {
      const data = await getCatalogProductsFn();
      return data;
    } catch {
      return { products: [], categories: ["All"] };
    }
  },
  component: Shop,
});

function Shop() {
  const loaderData = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");

  const categories = loaderData?.categories?.length ? loaderData.categories : ["All", "Combs", "Brushes", "Travel"];
  const products: DbProductSummary[] = loaderData?.products || [];

  const visible = useMemo(() => {
    const filtered = products.filter((product) => {
      const matchesCategory = category === "All" || product.category.toLowerCase() === category.toLowerCase();
      const text = `${product.name} ${product.tagline || ""} ${product.description}`.toLowerCase();
      return matchesCategory && text.includes(query.toLowerCase());
    });

    return [...filtered].sort((a, b) => {
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      if (sort === "stock") return b.stock - a.stock;
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [products, category, query, sort]);

  return (
    <Shell>
      <main>
        <header className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
          <span className="mb-4 block text-[11px] uppercase tracking-[0.3em] text-brand-sage font-medium">
            Natural Neem Wood Artifacts
          </span>
          <h1 className="max-w-4xl font-serif text-5xl leading-[1.02] text-brand-primary md:text-7xl">
            Every ritual, <span className="italic">gathered</span> in one place.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-brand-primary/70">
            Handcrafted with seasoned neem wood, cured in cold-pressed botanical oils, and designed to last a lifetime. Browse our full heirloom grooming collection.
          </p>
        </header>

        <section className="mx-auto max-w-7xl px-6 pb-12 md:px-10">
          <div className="grid gap-4 border-y border-brand-primary/10 py-5 md:grid-cols-[1fr_auto_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by neem tool, profile, benefits..."
              className="bg-transparent py-3 text-sm text-brand-primary outline-none placeholder:text-brand-primary/40 border-b md:border-b-0 border-brand-primary/10"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="bg-brand-cream py-3 px-3 text-sm text-brand-primary outline-none border border-brand-primary/10"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "All" ? "All Categories" : item}
                </option>
              ))}
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="bg-brand-cream py-3 px-3 text-sm text-brand-primary outline-none border border-brand-primary/10"
            >
              <option value="featured">Featured First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="stock">Availability</option>
            </select>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-brand-primary/60">
            <span>Showing {visible.length} {visible.length === 1 ? "creation" : "creations"}</span>
            {query && (
              <button onClick={() => setQuery("")} className="underline hover:text-brand-oak">
                Clear search query
              </button>
            )}
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl grid-cols-1 gap-x-8 gap-y-16 px-6 pb-32 md:grid-cols-2 md:px-10">
          {visible.length === 0 ? (
            <div className="col-span-2 border border-brand-primary/10 p-16 text-center">
              <p className="font-serif text-3xl text-brand-primary">No rituals match your selection.</p>
              <p className="mt-3 text-sm text-brand-primary/60">Try clearing filters or search for another neem tool.</p>
              <button
                onClick={() => {
                  setCategory("All");
                  setQuery("");
                }}
                className="mt-6 border-b border-brand-primary/30 pb-1 text-[11px] uppercase tracking-[0.2em] text-brand-primary hover:text-brand-oak"
              >
                Reset Catalog
              </button>
            </div>
          ) : (
            visible.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))
          )}
        </section>
      </main>
    </Shell>
  );
}
