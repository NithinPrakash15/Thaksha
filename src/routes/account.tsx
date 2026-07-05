import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { PrimaryButton, Shell } from "@/components/Shell";
import { formatMoney, products } from "@/data/catalog";
import {
  getOrders,
  getProfile,
  getWishlist,
  saveProfile,
  type CustomerOrder,
  type CustomerProfile,
} from "@/lib/store";

export const Route = createFileRoute("/account")({
  component: Account,
});

const emptyProfile = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
};

function Account() {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState(emptyProfile);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => {
      const current = getProfile();
      setProfile(current);
      setOrders(getOrders());
      setWishlist(getWishlist());
      if (current) setForm(current);
    };
    sync();
    window.addEventListener("thaksha:store", sync);
    return () => window.removeEventListener("thaksha:store", sync);
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const next = saveProfile(form);
    setProfile(next);
    setSaved(true);
  };

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <h1 className="font-serif text-6xl text-brand-primary">Customer Account</h1>
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <section className="border border-brand-primary/10 p-6">
            <p className="text-[11px] uppercase tracking-[0.25em] text-brand-sage">
              Create account
            </p>
            <h2 className="mt-4 font-serif text-3xl text-brand-primary">
              {profile ? profile.name : "New customer"}
            </h2>
            <form onSubmit={submit} className="mt-6 grid gap-4">
              {[
                ["name", "Full name"],
                ["email", "Email"],
                ["phone", "Mobile number"],
                ["address", "Address"],
                ["city", "City"],
                ["state", "State"],
                ["pincode", "PIN code"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="text-[10px] uppercase tracking-[0.2em] text-brand-primary"
                >
                  {label}
                  <input
                    required
                    value={form[key as keyof typeof form]}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                  />
                </label>
              ))}
              <PrimaryButton>{profile ? "Update Account" : "Create Account"}</PrimaryButton>
              {saved ? (
                <p className="text-sm text-brand-primary/60">Account details saved.</p>
              ) : null}
            </form>
          </section>
          <section className="border border-brand-primary/10 p-6 lg:col-span-2">
            <p className="text-[11px] uppercase tracking-[0.25em] text-brand-sage">Orders</p>
            <div className="mt-5 divide-y divide-brand-primary/10">
              {orders.length === 0 ? (
                <p className="py-5 text-sm text-brand-primary/60">No orders yet.</p>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="py-5">
                    <div className="flex justify-between gap-4">
                      <h3 className="font-serif text-2xl text-brand-primary">{order.id}</h3>
                      <span>{formatMoney(order.total)}</span>
                    </div>
                    <p className="mt-2 text-sm text-brand-primary/60">
                      {order.status} / {new Date(order.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
          <section className="border border-brand-primary/10 p-6 lg:col-span-3">
            <p className="text-[11px] uppercase tracking-[0.25em] text-brand-sage">Wishlist</p>
            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {wishlist.map((slug) => {
                const product = products.find((item) => item.slug === slug);
                if (!product) return null;
                return (
                  <Link key={slug} to="/product/$slug" params={{ slug }} className="flex gap-4">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-20 w-16 object-cover"
                    />
                    <div>
                      <p className="font-serif text-xl text-brand-primary">{product.name}</p>
                      <p className="text-sm text-brand-primary/60">{formatMoney(product.price)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </Shell>
  );
}
