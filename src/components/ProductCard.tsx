import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag } from "lucide-react";

import type { Product } from "@/data/catalog";
import { formatMoney } from "@/data/catalog";
import { addToCart, toggleWishlist } from "@/lib/store";

export function ProductCard({ product }: { product: Product }) {
  return (
    <article className="group">
      <Link to="/product/$slug" params={{ slug: product.slug }}>
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
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/product/$slug" params={{ slug: product.slug }}>
            <h2 className="font-serif text-3xl italic text-brand-primary">{product.name}</h2>
          </Link>
          <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-brand-sage">
            {product.tagline}
          </p>
        </div>
        <p className="font-serif text-2xl text-brand-primary">{formatMoney(product.price)}</p>
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
          <ShoppingBag size={15} />
          {product.status === "soon" ? "Notify Me" : "Add"}
        </button>
        <button
          onClick={() => toggleWishlist(product.slug)}
          className="inline-flex items-center gap-2 border-b border-brand-primary/25 pb-1 text-[11px] uppercase tracking-[0.22em] text-brand-primary hover:text-brand-oak"
        >
          <Heart size={15} />
          Wishlist
        </button>
      </div>
    </article>
  );
}
