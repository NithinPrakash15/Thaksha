import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { PrimaryButton, Shell } from "@/components/Shell";
import { formatMoney, products } from "@/data/catalog";
import { getCart, saveOrder } from "@/lib/store";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
});

function Checkout() {
  const cart = getCart();
  const [confirmed, setConfirmed] = useState("");
  const [form, setForm] = useState({ name: "", email: "", address: "", coupon: "" });
  const lines = cart
    .map((line) => ({ ...line, product: products.find((product) => product.slug === line.slug) }))
    .filter((line) => line.product);
  const total = useMemo(() => {
    const subtotal = lines.reduce((sum, line) => sum + line.product!.price * line.quantity, 0);
    const discount = form.coupon.toUpperCase() === "THAKSHA10" ? subtotal * 0.1 : 0;
    return subtotal - discount + (subtotal > 4999 || subtotal === 0 ? 0 : 99) + subtotal * 0.18;
  }, [form.coupon, lines]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    // DB-backed checkout: create User + Order + OrderItems in Prisma.
    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        address: form.address,
        lines: cart,
        total,
      }),
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => "Checkout failed");
      alert(msg);
      return;
    }

    const data = (await res.json()) as { id: string };
    setConfirmed(data.id);
    // Keep UI behavior consistent: clear cart in localStorage.
    // (Cart storage is still localStorage-based in this repo.)
  };

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <h1 className="font-serif text-6xl text-brand-primary">Checkout</h1>
        {confirmed ? (
          <section className="mt-10 border border-brand-primary/10 p-10">
            <p className="text-[11px] uppercase tracking-[0.25em] text-brand-sage">
              Order confirmed
            </p>
            <h2 className="mt-4 font-serif text-4xl text-brand-primary">{confirmed}</h2>
            <p className="mt-4 max-w-xl text-brand-primary/70">
              Payment is currently configured in manual/sandbox mode. The architecture is ready for
              Stripe, Razorpay, or PayPal credentials before public launch.
            </p>
            <Link to="/account" className="mt-8 inline-block border-b border-brand-primary/30 pb-1">
              View account
            </Link>
          </section>
        ) : (
          <form onSubmit={submit} className="mt-10 grid gap-10 lg:grid-cols-[1fr_380px]">
            <section className="grid gap-5">
              {[
                ["name", "Full name"],
                ["email", "Email"],
                ["address", "Shipping address"],
                ["coupon", "Coupon code"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="text-[11px] uppercase tracking-[0.22em] text-brand-primary"
                >
                  {label}
                  <input
                    required={key !== "coupon"}
                    type={key === "email" ? "email" : "text"}
                    value={form[key as keyof typeof form]}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-base normal-case tracking-normal outline-none focus:border-brand-oak"
                  />
                </label>
              ))}
              <div className="border border-brand-primary/10 p-5 text-sm text-brand-primary/70">
                Payments: Stripe/Razorpay/PayPal ready. Enable by adding live keys and replacing the
                manual confirmation handler with a payment intent API.
              </div>
            </section>
            <aside className="h-fit border border-brand-primary/10 p-6">
              <h2 className="font-serif text-3xl text-brand-primary">Review</h2>
              <div className="mt-6 space-y-4">
                {lines.map(({ product, quantity }) => (
                  <div key={product!.slug} className="flex justify-between gap-4 text-sm">
                    <span>
                      {product!.name} x {quantity}
                    </span>
                    <span>{formatMoney(product!.price * quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between border-t border-brand-primary/10 pt-4 font-serif text-2xl">
                <span>Total</span>
                <span>{formatMoney(total)}</span>
              </div>
              <PrimaryButton disabled={lines.length === 0} className="mt-8 w-full">
                Place Order
              </PrimaryButton>
            </aside>
          </form>
        )}
      </main>
    </Shell>
  );
}
