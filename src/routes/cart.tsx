import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PrimaryButton, Shell } from "@/components/Shell";
import { formatMoney, products } from "@/data/catalog";
import { getCart, updateCartQuantity, type CartLine } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  component: Cart,
});

function Cart() {
  const [cart, setCartState] = useState<CartLine[]>([]);
  const sync = () => setCartState(getCart());

  useEffect(() => {
    sync();
    window.addEventListener("thaksha:store", sync);
    return () => window.removeEventListener("thaksha:store", sync);
  }, []);

  const lines = cart
    .map((line) => ({ ...line, product: products.find((product) => product.slug === line.slug) }))
    .filter((line) => line.product);
  const subtotal = lines.reduce((sum, line) => sum + line.product!.price * line.quantity, 0);
  const shipping = subtotal > 4999 || subtotal === 0 ? 0 : 99;
  const tax = subtotal * 0.18;
  const total = subtotal + shipping + tax;

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <h1 className="font-serif text-6xl text-brand-primary">Cart</h1>
        {lines.length === 0 ? (
          <div className="mt-10 border border-brand-primary/10 p-10">
            <p className="text-brand-primary/70">Your cart is empty.</p>
            <Link to="/shop" className="mt-6 inline-block border-b border-brand-primary/30 pb-1">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
            <section className="divide-y divide-brand-primary/10 border-y border-brand-primary/10">
              {lines.map(({ product, quantity }) => (
                <div key={product!.slug} className="grid gap-5 py-6 sm:grid-cols-[120px_1fr_auto]">
                  <img
                    src={product!.image}
                    alt={product!.name}
                    className="h-36 w-28 object-cover"
                  />
                  <div>
                    <h2 className="font-serif text-3xl text-brand-primary">{product!.name}</h2>
                    <p className="mt-2 text-sm text-brand-primary/60">{product!.tagline}</p>
                    <button
                      onClick={() => updateCartQuantity(product!.slug, 0)}
                      className="mt-5 text-[11px] uppercase tracking-[0.2em] text-brand-primary/50"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="space-y-3 text-right">
                    <input
                      type="number"
                      min={0}
                      value={quantity}
                      onChange={(event) =>
                        updateCartQuantity(product!.slug, Number(event.target.value))
                      }
                      className="w-20 border border-brand-primary/15 bg-transparent p-3 text-center"
                    />
                    <p className="font-serif text-2xl text-brand-primary">
                      {formatMoney(product!.price * quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </section>
            <aside className="h-fit border border-brand-primary/10 p-6">
              <h2 className="font-serif text-3xl text-brand-primary">Order summary</h2>
              <dl className="mt-6 space-y-4 text-sm text-brand-primary/70">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd>{formatMoney(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Shipping</dt>
                  <dd>{shipping === 0 ? "Free" : formatMoney(shipping)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Estimated tax</dt>
                  <dd>{formatMoney(tax)}</dd>
                </div>
                <div className="flex justify-between border-t border-brand-primary/10 pt-4 font-serif text-2xl text-brand-primary">
                  <dt>Total</dt>
                  <dd>{formatMoney(total)}</dd>
                </div>
              </dl>
              <Link to="/checkout">
                <PrimaryButton className="mt-8 w-full">Checkout</PrimaryButton>
              </Link>
            </aside>
          </div>
        )}
      </main>
    </Shell>
  );
}
