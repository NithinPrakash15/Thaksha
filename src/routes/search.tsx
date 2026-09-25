import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ProductCard } from "@/components/ProductCard";
import { Shell } from "@/components/Shell";
import { searchProductsFn, getCatalogProductsFn, type DbProductSummary } from "@/lib/server-products";
import { Search as SearchIcon, X } from "lucide-react";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search Rituals & Neem Wood Tools — Thaksha" },
      { name: "description", content: "Search our curated collection of artisanal neem wood combs and brushes." },
    ],
  }),
  loader: async () => {
    try {
      const initial = await getCatalogProductsFn();
      return { initialProducts: initial?.products || [] };
    } catch {
      return { initialProducts: [] };
    }
  },
  component: SearchPage,
});

function SearchPage() {
  const { initialProducts } = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DbProductSummary[]>(initialProducts);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults(initialProducts);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchProductsFn({ data: query.trim() });
        setResults(res);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, initialProducts]);

  const quickPills = ["Neem comb", "Detangler", "Travel", "Paddle brush", "Wide tooth", "Scalp circulation"];

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <header className="max-w-2xl">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
            Catalog Discovery
          </span>
          <h1 className="mt-2 font-serif text-5xl md:text-6xl text-brand-primary">
            Find Your Ritual
          </h1>
          <p className="mt-3 text-sm text-brand-primary/70">
            Search by wood finish, tooth geometry, travel profile, or hair wellness benefit.
          </p>
        </header>

        {/* Search input field */}
        <div className="relative mt-10">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try 'detangler', 'travel', 'wide tooth', 'paddle'..."
            className="w-full border-b-2 border-brand-primary/20 bg-transparent py-5 pl-2 pr-12 text-2xl md:text-3xl text-brand-primary outline-none transition-colors placeholder:text-brand-primary/30 focus:border-brand-primary"
          />

          {query ? (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brand-primary/40 hover:text-brand-primary"
              aria-label="Clear search"
            >
              <X size={20} />
            </button>
          ) : (
            <SearchIcon
              size={24}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-primary/30 pointer-events-none"
            />
          )}
        </div>

        {/* Quick search tags */}
        <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-brand-primary/60">
          <span className="text-brand-primary/40 text-[10px]">Suggestions:</span>
          {quickPills.map((item) => (
            <button
              key={item}
              onClick={() => setQuery(item)}
              className={`border px-3 py-1.5 transition-colors ${
                query.toLowerCase() === item.toLowerCase()
                  ? "border-brand-primary bg-brand-primary text-brand-cream"
                  : "border-brand-primary/10 hover:border-brand-oak hover:text-brand-primary"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Results section */}
        <div className="mt-14">
          <div className="flex items-center justify-between border-b border-brand-primary/10 pb-4 text-xs uppercase tracking-[0.2em] text-brand-primary/60">
            <span>
              {searching
                ? "Searching catalog..."
                : query
                  ? `Found ${results.length} results for "${query}"`
                  : `Showing all ${results.length} creations`}
            </span>
          </div>

          {results.length === 0 ? (
            <div className="border border-brand-primary/10 p-16 text-center my-12 bg-brand-cream/30">
              <SearchIcon size={32} className="mx-auto text-brand-primary/30 mb-4" />
              <h2 className="font-serif text-3xl text-brand-primary">No rituals match "{query}"</h2>
              <p className="mt-3 text-sm text-brand-primary/60 max-w-md mx-auto">
                We couldn't find any neem tools matching that term. Check the spelling or explore our combs and brushes categories.
              </p>
              <button
                onClick={() => setQuery("")}
                className="mt-6 border-b border-brand-primary/40 pb-1 text-[11px] uppercase tracking-[0.2em] text-brand-primary hover:text-brand-oak"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <section className="mt-8 grid gap-x-8 gap-y-16 md:grid-cols-2">
              {results.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </section>
          )}
        </div>
      </main>
    </Shell>
  );
}
