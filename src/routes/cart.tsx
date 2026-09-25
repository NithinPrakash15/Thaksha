import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PrimaryButton, Shell } from "@/components/Shell";
import { formatRupees } from "@/lib/server-products";
import { getCart, updateCartQuantity, clearCart, type CartLine } from "@/lib/store";
import { calculateOrderPricingFn, type PricingCalculation } from "@/lib/server-orders";
import { Trash2, Plus, Minus, ArrowRight, ShieldCheck, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Your Sanctuary Cart — Thaksha" },
      { name: "description", content: "Review and manage your selected handcrafted neem ritual tools." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const [rawCart, setRawCart] = useState<CartLine[]>([]);
  const [pricing, setPricing] = useState<PricingCalculation | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPricing = async (cartItems: CartLine[]) => {
    if (cartItems.length === 0) {
      setPricing(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await calculateOrderPricingFn({
        data: { items: cartItems },
      });
      setPricing(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to calculate current cart prices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = getCart();
    setRawCart(initial);
    fetchPricing(initial);

    const handleStoreChange = () => {
      const updated = getCart();
      setRawCart(updated);
      fetchPricing(updated);
    };

    window.addEventListener("thaksha:store", handleStoreChange);
    return () => window.removeEventListener("thaksha:store", handleStoreChange);
  }, []);

  const handleUpdateQuantity = (slug: string, newQty: number) => {
    updateCartQuantity(slug, newQty);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all items from your cart?")) {
      clearCart();
      toast.success("Cart cleared.");
    }
  };

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <div className="flex items-baseline justify-between border-b border-brand-primary/10 pb-6">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
              Shopping Sanctuary
            </span>
            <h1 className="mt-2 font-serif text-5xl md:text-6xl text-brand-primary">
              Your Ritual Bag
            </h1>
          </div>
          {rawCart.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs uppercase tracking-[0.2em] text-brand-primary/50 hover:text-brand-primary underline"
            >
              Clear Bag
            </button>
          )}
        </div>

        {rawCart.length === 0 || !pricing || pricing.items.length === 0 ? (
          <div className="my-16 border border-brand-primary/10 p-16 text-center bg-brand-cream/40 max-w-2xl mx-auto">
            <Sparkles size={32} className="mx-auto text-brand-oak/40 mb-4" />
            <h2 className="font-serif text-3xl text-brand-primary">Your ritual bag is empty</h2>
            <p className="mt-3 text-sm text-brand-primary/70 leading-relaxed">
              Explore our handcrafted collection of seasoned neem combs, scalp detanglers, and travel artifacts.
            </p>
            <Link to="/shop">
              <PrimaryButton className="mt-8 inline-flex items-center gap-2">
                <span>Explore Catalog</span>
                <ArrowRight size={14} />
              </PrimaryButton>
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_400px]">
            {/* Items List */}
            <section className="space-y-6">
              {pricing.outOfStockItems.length > 0 && (
                <div className="border border-red-500/30 bg-red-50 p-4 text-xs text-red-800 flex items-center gap-2">
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>
                    Some items in your cart exceed available stock: {pricing.outOfStockItems.join(", ")}. Please adjust quantities.
                  </span>
                </div>
              )}

              <div className="divide-y divide-brand-primary/10 border-y border-brand-primary/10">
                {pricing.items.map((item) => (
                  <div key={item.slug} className="py-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <Link to="/product/$slug" params={{ slug: item.slug }}>
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-28 w-24 object-cover border border-brand-primary/10"
                        />
                      </Link>
                      <div>
                        <Link to="/product/$slug" params={{ slug: item.slug }}>
                          <h3 className="font-serif text-2xl text-brand-primary hover:text-brand-oak transition-colors">
                            {item.name}
                          </h3>
                        </Link>
                        <p className="text-xs text-brand-sage uppercase tracking-wider mt-0.5">SKU: {item.sku}</p>
                        <p className="font-serif text-base text-brand-primary mt-2">
                          {formatRupees(item.unitPrice)} each
                        </p>
                        {item.stock <= 5 && (
                          <p className="text-xs text-amber-700 mt-1">Only {item.stock} units left</p>
                        )}
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4">
                      {/* Quantity controls */}
                      <div className="flex items-center border border-brand-primary/20">
                        <button
                          onClick={() => handleUpdateQuantity(item.slug, item.quantity - 1)}
                          className="p-2 text-brand-primary/60 hover:text-brand-primary transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-10 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => handleUpdateQuantity(item.slug, item.quantity + 1)}
                          disabled={item.quantity >= item.stock}
                          className="p-2 text-brand-primary/60 hover:text-brand-primary transition-colors disabled:opacity-30"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="font-serif text-2xl text-brand-primary">
                          {formatRupees(item.lineTotal)}
                        </p>
                        <button
                          onClick={() => handleUpdateQuantity(item.slug, 0)}
                          className="text-xs text-red-700/60 hover:text-red-700 transition-colors inline-flex items-center gap-1 mt-1"
                        >
                          <Trash2 size={12} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 flex items-center justify-between text-xs text-brand-primary/60">
                <Link to="/shop" className="underline hover:text-brand-oak flex items-center gap-1">
                  ← Continue selecting rituals
                </Link>
                <span>Free delivery automatically applied over ₹4,999</span>
              </div>
            </section>

            {/* Order Summary Sidebar */}
            <aside className="border border-brand-primary/10 p-6 md:p-8 bg-brand-cream/50 h-fit lg:sticky lg:top-28">
              <h2 className="font-serif text-3xl text-brand-primary border-b border-brand-primary/10 pb-4">
                Summary
              </h2>

              <dl className="mt-6 space-y-4 text-sm text-brand-primary/75">
                <div className="flex justify-between">
                  <dt>Bag Subtotal</dt>
                  <dd className="font-medium text-brand-primary">{formatRupees(pricing.subtotal)}</dd>
                </div>

                <div className="flex justify-between">
                  <dt>Shipping</dt>
                  <dd className="font-medium text-brand-primary">
                    {pricing.shipping === 0 ? (
                      <span className="text-green-800 font-semibold">Complimentary</span>
                    ) : (
                      formatRupees(pricing.shipping)
                    )}
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt>Estimated GST (18%)</dt>
                  <dd className="font-medium text-brand-primary">{formatRupees(pricing.tax)}</dd>
                </div>

                <div className="flex justify-between border-t border-brand-primary/10 pt-4 font-serif text-3xl text-brand-primary">
                  <dt>Total</dt>
                  <dd>{formatRupees(pricing.total)}</dd>
                </div>
              </dl>

              <div className="mt-8 space-y-4">
                <Link to="/checkout" className="block">
                  <PrimaryButton
                    disabled={loading || pricing.outOfStockItems.length > 0}
                    className="w-full flex items-center justify-center gap-2 py-4"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight size={14} />
                  </PrimaryButton>
                </Link>

                <div className="border border-brand-primary/10 p-4 text-xs text-brand-primary/70 flex items-center gap-3">
                  <ShieldCheck size={20} className="text-brand-oak flex-shrink-0" />
                  <span>Secure multi-step checkout with instant UPI, card, and tracking support.</span>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </Shell>
  );
}
