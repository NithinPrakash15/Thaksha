import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PrimaryButton, Shell } from "@/components/Shell";
import { formatRupees } from "@/lib/server-products";
import { getViewerFn, updateCustomerProfileFn, logoutUserFn, type SafeUser } from "@/lib/server-auth";
import { getCustomerOrdersFn } from "@/lib/server-orders";
import { getWishlist, toggleWishlist, addToCart } from "@/lib/store";
import {
  UserRound,
  Package,
  Heart,
  MapPin,
  Clock,
  ArrowRight,
  LogOut,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  loader: async () => {
    const user = await getViewerFn().catch(() => null);
    if (!user) {
      throw redirect({ to: "/login", search: { redirect: "/account" } });
    }
    const orders = await getCustomerOrdersFn().catch(() => []);
    return { user, orders };
  },
  head: () => ({
    meta: [{ title: "Patron Sanctuary Account — Thaksha" }],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { user, orders } = Route.useLoaderData();
  const [activeTab, setActiveTab] = useState<"orders" | "profile" | "wishlist">("orders");

  // Profile form
  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(user.phone || "");
  const [line1, setLine1] = useState("");
  const [city, setCity] = useState("");
  const [region, setRegion] = useState("");
  const [postal, setPostal] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Wishlist state
  const [wishlistSlugs, setWishlistSlugs] = useState<string[]>([]);

  useEffect(() => {
    const syncWishlist = () => setWishlistSlugs(getWishlist());
    syncWishlist();
    window.addEventListener("thaksha:store", syncWishlist);
    return () => window.removeEventListener("thaksha:store", syncWishlist);
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);

    try {
      await updateCustomerProfileFn({
        data: { name, phone, line1, city, region, postal },
      });
      toast.success("Profile and address preferences updated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUserFn();
      toast.success("Signed out.");
      window.location.href = "/";
    } catch {
      toast.error("Logout failed.");
    }
  };

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        {/* User Hero Banner */}
        <header className="border-b border-brand-primary/10 pb-8 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
              Patron Sanctuary
            </span>
            <h1 className="mt-2 font-serif text-5xl md:text-6xl text-brand-primary">
              {user.name || "Patron Profile"}
            </h1>
            <p className="mt-2 text-xs text-brand-primary/60">
              Account Member since {new Date(user.createdAt).getFullYear()} • {user.email}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {user.role === "ADMIN" && (
              <Link to="/admin">
                <button className="border border-brand-oak bg-brand-cream text-brand-oak px-4 py-2 text-xs uppercase tracking-wider font-semibold flex items-center gap-1.5 hover:bg-brand-oak hover:text-brand-cream transition-colors">
                  <Shield size={14} />
                  <span>Admin Dashboard</span>
                </button>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="text-xs uppercase tracking-[0.2em] text-brand-primary/60 hover:text-brand-primary flex items-center gap-1.5 border-b border-brand-primary/20 pb-1"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="mt-10 flex border-b border-brand-primary/10">
          {[
            { id: "orders", label: `Purchases & Orders (${orders.length})`, icon: Package },
            { id: "profile", label: "Profile & Addresses", icon: MapPin },
            { id: "wishlist", label: `Sanctuary Wishlist (${wishlistSlugs.length})`, icon: Heart },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 pb-4 px-6 text-xs uppercase tracking-[0.2em] font-medium transition-colors ${
                activeTab === id
                  ? "border-b-2 border-brand-primary text-brand-primary font-semibold"
                  : "text-brand-primary/40 hover:text-brand-primary"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <section className="mt-10 space-y-6">
            {orders.length === 0 ? (
              <div className="border border-brand-primary/10 p-16 text-center bg-brand-cream/40 max-w-xl mx-auto">
                <Clock size={32} className="mx-auto text-brand-oak/40 mb-3" />
                <h3 className="font-serif text-3xl text-brand-primary">No previous orders</h3>
                <p className="mt-2 text-sm text-brand-primary/70">
                  Your purchase history will be recorded here with live dispatch tracking and receipts.
                </p>
                <Link to="/shop">
                  <PrimaryButton className="mt-6">Explore the Collection</PrimaryButton>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-brand-primary/10 border-y border-brand-primary/10">
                {orders.map((ord: any) => (
                  <div
                    key={ord.id}
                    className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-brand-cream/30 transition-colors px-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-serif text-2xl text-brand-primary">{ord.orderNumber}</span>
                        <span
                          className={`px-2.5 py-0.5 text-[9px] uppercase tracking-wider font-semibold ${
                            ord.status === "DELIVERED"
                              ? "bg-green-100 text-green-900 border border-green-200"
                              : ord.status === "SHIPPED"
                                ? "bg-blue-100 text-blue-900 border border-blue-200"
                                : "bg-amber-100 text-amber-900 border border-amber-200"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-xs text-brand-primary/60">
                        Ordered on {ord.date} • {ord.itemsCount} {ord.itemsCount === 1 ? "item" : "items"}
                      </p>
                      <p className="text-xs text-brand-primary/80 pt-1">
                        {ord.items.map((i: any) => `${i.name} (${i.quantity})`).join(", ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <span className="text-[10px] uppercase tracking-wider text-brand-primary/50 block">Amount</span>
                        <span className="font-serif text-2xl text-brand-primary">{formatRupees(ord.totalRupees)}</span>
                      </div>

                      <Link to="/orders/$id" params={{ id: ord.id }}>
                        <button className="border border-brand-primary/30 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-brand-primary hover:border-brand-primary flex items-center gap-1.5 transition-colors">
                          <span>View Details & Tracking</span>
                          <ArrowRight size={12} />
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <section className="mt-10 max-w-2xl border border-brand-primary/10 p-8 bg-brand-cream/40">
            <h3 className="font-serif text-3xl text-brand-primary mb-6">Patron Details</h3>

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                  Full Name
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                  />
                </label>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                  Mobile Number (For dispatch alerts)
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                  />
                </label>
              </div>

              <div className="border-t border-brand-primary/10 pt-5">
                <h4 className="text-[11px] uppercase tracking-[0.2em] text-brand-sage font-semibold mb-4">
                  Default Delivery Address
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                      Street Address
                      <input
                        type="text"
                        value={line1}
                        onChange={(e) => setLine1(e.target.value)}
                        placeholder="Apartment, Street name"
                        className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                        City
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Bengaluru"
                          className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                        State
                        <input
                          type="text"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          placeholder="Karnataka"
                          className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                        PIN Code
                        <input
                          type="text"
                          value={postal}
                          onChange={(e) => setPostal(e.target.value)}
                          placeholder="560038"
                          className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <PrimaryButton disabled={savingProfile} className="mt-4">
                {savingProfile ? "Saving Preferences..." : "Save Preferences"}
              </PrimaryButton>
            </form>
          </section>
        )}

        {/* Wishlist Tab */}
        {activeTab === "wishlist" && (
          <section className="mt-10">
            {wishlistSlugs.length === 0 ? (
              <div className="border border-brand-primary/10 p-16 text-center bg-brand-cream/40 max-w-xl mx-auto">
                <Heart size={32} className="mx-auto text-brand-oak/40 mb-3" />
                <h3 className="font-serif text-3xl text-brand-primary">Sanctuary wishlist is empty</h3>
                <p className="mt-2 text-sm text-brand-primary/70">
                  Save neem ritual items to revisit later or add to bag when ready.
                </p>
                <Link to="/shop">
                  <PrimaryButton className="mt-6">Browse Creations</PrimaryButton>
                </Link>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                {wishlistSlugs.map((slug) => (
                  <div key={slug} className="border border-brand-primary/10 p-5 bg-brand-cream/50 flex flex-col justify-between">
                    <div>
                      <h4 className="font-serif text-2xl text-brand-primary capitalize">
                        {slug.replace(/-/g, " ")}
                      </h4>
                      <Link to="/product/$slug" params={{ slug }} className="text-xs text-brand-oak hover:underline mt-1 block">
                        View Product Details →
                      </Link>
                    </div>

                    <div className="mt-6 flex justify-between items-center border-t border-brand-primary/10 pt-4">
                      <button
                        onClick={() => {
                          toggleWishlist(slug);
                          toast.info("Removed from wishlist.");
                        }}
                        className="text-xs text-red-700/60 hover:text-red-700 underline"
                      >
                        Remove
                      </button>
                      <Link to="/product/$slug" params={{ slug }}>
                        <button className="bg-brand-primary text-brand-cream px-4 py-2 text-[10px] uppercase tracking-wider hover:bg-brand-oak transition-colors">
                          Add to Bag
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </Shell>
  );
}
