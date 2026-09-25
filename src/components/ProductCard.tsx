import { Link } from "@tanstack/react-router";
import { Heart, ShoppingBag } from "lucide-react";
import { addToCart, toggleWishlist, getWishlist } from "@/lib/store";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export type CardProduct = {
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  price: number;
  compareAt?: number;
  stock?: number;
  category?: string;
  image: string;
  status?: string;
};

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export function ProductCard({ product }: { product: CardProduct }) {
  const [inWishlist, setInWishlist] = useState(false);

  useEffect(() => {
    const syncWishlist = () => setInWishlist(getWishlist().includes(product.slug));
    syncWishlist();
    window.addEventListener("thaksha:store", syncWishlist);
    return () => window.removeEventListener("thaksha:store", syncWishlist);
  }, [product.slug]);

  const isOutOfStock = product.stock !== undefined && product.stock <= 0;
  const isLowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;

  const handleAddToCart = () => {
    if (isOutOfStock) {
      toast.error(`${product.name} is currently out of stock. Added to waitlist.`);
      toggleWishlist(product.slug);
      return;
    }

    addToCart(
      {
        slug: product.slug,
        name: product.name,
        price: product.price,
        description: product.description,
        image: product.image,
        tagline: product.tagline || "",
        status: (product.status === "ARCHIVED" ? "soon" : "available") as any,
        inventory: product.stock || 10,
        sku: product.slug.toUpperCase(),
        category: product.category || "Combs",
        color: "Natural",
        size: "Standard",
        gallery: [product.image],
        benefits: [],
        specs: {},
      },
      1,
    );
    toast.success(`${product.name} added to cart.`);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.slug);
    toast.success(
      inWishlist ? `Removed ${product.name} from wishlist.` : `Saved ${product.name} to wishlist.`,
    );
  };

  return (
    <article className="group flex flex-col justify-between">
      <div>
        <Link to="/product/$slug" params={{ slug: product.slug }}>
          <div className="relative mb-5 aspect-[4/5] overflow-hidden bg-brand-sage-soft/30">
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
            />

            <div className="absolute left-4 top-4 flex flex-col gap-1.5">
              {isOutOfStock ? (
                <span className="bg-red-800 text-brand-cream px-3 py-1 text-[10px] uppercase tracking-[0.22em]">
                  Out of Stock
                </span>
              ) : isLowStock ? (
                <span className="bg-amber-700 text-brand-cream px-3 py-1 text-[10px] uppercase tracking-[0.22em]">
                  Only {product.stock} Left
                </span>
              ) : (
                <span className="bg-brand-cream/95 text-brand-primary px-3 py-1 text-[10px] uppercase tracking-[0.22em] shadow-sm">
                  Available
                </span>
              )}
            </div>

            {product.category && (
              <span className="absolute right-4 bottom-4 bg-brand-primary/80 text-brand-cream text-[9px] uppercase tracking-[0.2em] px-2.5 py-1 backdrop-blur-sm">
                {product.category}
              </span>
            )}
          </div>
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to="/product/$slug" params={{ slug: product.slug }}>
              <h2 className="font-serif text-2xl md:text-3xl text-brand-primary group-hover:text-brand-oak transition-colors">
                {product.name}
              </h2>
            </Link>
            {product.tagline && (
              <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-brand-sage">
                {product.tagline}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="font-serif text-2xl text-brand-primary">{formatPrice(product.price)}</p>
            {product.compareAt && (
              <p className="text-xs text-brand-primary/40 line-through">
                {formatPrice(product.compareAt)}
              </p>
            )}
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-brand-primary/70 line-clamp-2">
          {product.description}
        </p>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-brand-primary/10 pt-4">
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-brand-primary hover:text-brand-oak transition-colors disabled:opacity-40"
        >
          <ShoppingBag size={14} />
          {isOutOfStock ? "Sold Out" : "Add to Cart"}
        </button>

        <button
          onClick={handleToggleWishlist}
          className={`inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] transition-colors ${
            inWishlist ? "text-red-700 font-semibold" : "text-brand-primary/60 hover:text-brand-oak"
          }`}
        >
          <Heart size={14} className={inWishlist ? "fill-red-700" : ""} />
          <span>{inWishlist ? "Saved" : "Save"}</span>
        </button>
      </div>
    </article>
  );
}
