import { createFileRoute, notFound } from "@tanstack/react-router";
import { Heart, Share2, Truck } from "lucide-react";
import { useState } from "react";

import { PrimaryButton, Shell } from "@/components/Shell";
import { formatMoney, getProduct, products } from "@/data/catalog";
import { addToCart, toggleWishlist } from "@/lib/store";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  component: ProductPage,
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const [image, setImage] = useState(product.image);
  const [quantity, setQuantity] = useState(1);

  return (
    <Shell>
      <main className="mx-auto grid max-w-7xl gap-12 px-6 py-12 md:px-10 lg:grid-cols-2">
        <section>
          <div className="aspect-[4/5] overflow-hidden bg-brand-sage-soft/30">
            <img src={image} alt={product.name} className="h-full w-full object-cover" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {product.gallery.map((item) => (
              <button
                key={item}
                onClick={() => setImage(item)}
                className="aspect-square overflow-hidden border border-brand-primary/10"
              >
                <img src={item} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </section>
        <section className="lg:sticky lg:top-28 lg:self-start">
          <p className="text-[11px] uppercase tracking-[0.28em] text-brand-sage">
            {product.category} / {product.sku}
          </p>
          <h1 className="mt-5 font-serif text-6xl leading-none text-brand-primary">
            {product.name}
          </h1>
          <p className="mt-4 text-lg text-brand-primary/70">{product.tagline}</p>
          <div className="mt-8 flex items-end gap-4">
            <span className="font-serif text-4xl text-brand-primary">
              {formatMoney(product.price)}
            </span>
            {product.compareAt ? (
              <span className="text-sm text-brand-primary/40 line-through">
                {formatMoney(product.compareAt)}
              </span>
            ) : null}
          </div>
          <p className="mt-8 max-w-xl leading-relaxed text-brand-primary/70">
            {product.description}
          </p>
          <div className="mt-8 grid gap-3 text-sm text-brand-primary/70 sm:grid-cols-2">
            {product.benefits.map((benefit) => (
              <div key={benefit} className="border border-brand-primary/10 p-4">
                {benefit}
              </div>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <label className="text-[11px] uppercase tracking-[0.22em] text-brand-primary">
              Quantity
              <input
                type="number"
                min={1}
                max={9}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
                className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-base tracking-normal"
              />
            </label>
            <div className="sm:col-span-2">
              <PrimaryButton
                onClick={() => {
                  if (product.status === "soon") {
                    toggleWishlist(product.slug);
                    window.alert(`${product.name} added to your waitlist.`);
                    return;
                  }
                  addToCart(product, quantity);
                }}
                className="h-full w-full"
              >
                {product.status === "soon" ? "Join Waitlist" : "Add to Cart"}
              </PrimaryButton>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-4 text-[11px] uppercase tracking-[0.2em] text-brand-primary">
            <button
              onClick={() => toggleWishlist(product.slug)}
              className="inline-flex items-center gap-2"
            >
              <Heart size={15} /> Wishlist
            </button>
            <button
              onClick={() => navigator.share?.({ title: product.name, url: window.location.href })}
              className="inline-flex items-center gap-2"
            >
              <Share2 size={15} /> Share
            </button>
            <span className="inline-flex items-center gap-2">
              <Truck size={15} /> Ships across India in 2-5 days
            </span>
          </div>
          <div className="mt-10 divide-y divide-brand-primary/10 border-y border-brand-primary/10">
            {Object.entries(product.specs).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-6 py-4 text-sm">
                <span className="text-brand-primary/50">{key}</span>
                <span className="text-right text-brand-primary">{value}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="border-t border-brand-primary/10 pt-12 lg:col-span-2">
          <h2 className="font-serif text-4xl text-brand-primary">Frequently bought together</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {products
              .filter((item) => item.slug !== product.slug)
              .slice(0, 3)
              .map((item) => (
                <a key={item.slug} href={`/product/${item.slug}`} className="group flex gap-4">
                  <img src={item.image} alt={item.name} className="h-24 w-20 object-cover" />
                  <div>
                    <p className="font-serif text-xl text-brand-primary">{item.name}</p>
                    <p className="text-sm text-brand-primary/60">{formatMoney(item.price)}</p>
                  </div>
                </a>
              ))}
          </div>
        </section>
      </main>
    </Shell>
  );
}
