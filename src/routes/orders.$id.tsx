import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Shell, PrimaryButton } from "@/components/Shell";
import { getOrderDetailFn } from "@/lib/server-orders";
import { formatRupees } from "@/lib/server-products";
import { addToCart } from "@/lib/store";
import {
  CheckCircle2,
  Clock,
  Package,
  Truck,
  Home,
  AlertTriangle,
  ArrowLeft,
  Copy,
  Receipt,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/orders/$id")({
  loader: async ({ params }) => {
    try {
      const order = await getOrderDetailFn({ data: params.id });
      if (!order) throw notFound();
      return { order };
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Order Tracking: ${loaderData?.order?.orderNumber || "Details"} — Thaksha` },
    ],
  }),
  component: OrderDetailPage,
});

function OrderDetailPage() {
  const { order } = Route.useLoaderData();

  // Status mapping for stepper
  const steps = [
    { key: "PENDING", label: "Order Placed", icon: Clock },
    { key: "PAID", label: "Payment Confirmed", icon: CheckCircle2 },
    { key: "PROCESSING", label: "Artisan Crafting & Packing", icon: Package },
    { key: "SHIPPED", label: "Dispatched / In Transit", icon: Truck },
    { key: "DELIVERED", label: "Delivered", icon: Home },
  ];

  const statusOrder = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"];
  const currentIdx = statusOrder.indexOf(order.status);
  const isCancelled = order.status === "CANCELLED" || order.status === "REFUNDED";

  const handleCopyOrderNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    toast.success("Order reference copied to clipboard.");
  };

  const handleReorder = () => {
    for (const item of order.items) {
      addToCart(
        {
          slug: item.slug,
          name: item.name,
          price: item.priceRupees,
          description: "",
          image: item.image,
          tagline: "",
          status: "available",
          inventory: 10,
          sku: item.sku,
          category: "Rituals",
          color: "Natural",
          size: "Standard",
          gallery: [item.image],
          benefits: [],
          specs: {},
        },
        item.quantity,
      );
    }
    toast.success("Items added to your bag.");
  };

  return (
    <Shell>
      <main className="mx-auto max-w-5xl px-6 py-12 md:px-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link to="/account" className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-brand-primary/60 hover:text-brand-primary">
            <ArrowLeft size={14} />
            <span>Back to Sanctuary Account</span>
          </Link>

          <button
            onClick={handleCopyOrderNumber}
            className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-brand-oak hover:underline"
          >
            <Copy size={12} />
            <span>Copy Reference</span>
          </button>
        </div>

        {/* Header Summary */}
        <header className="border-b border-brand-primary/10 pb-8 flex flex-col md:flex-row md:items-baseline justify-between gap-4">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
              Live Order Dispatch
            </span>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl text-brand-primary">
              Order {order.orderNumber}
            </h1>
            <p className="mt-2 text-xs text-brand-primary/60">
              Placed on {order.formattedDate} • Billed to {order.email}
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-block px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] font-semibold ${
                order.status === "DELIVERED"
                  ? "bg-green-100 text-green-900 border border-green-300"
                  : order.status === "SHIPPED"
                    ? "bg-blue-100 text-blue-900 border border-blue-300"
                    : isCancelled
                      ? "bg-red-100 text-red-900 border border-red-300"
                      : "bg-amber-100 text-amber-900 border border-amber-300"
              }`}
            >
              Status: {order.status}
            </span>
            <p className="font-serif text-2xl text-brand-primary mt-2">
              {formatRupees(order.totalRupees)}
            </p>
          </div>
        </header>

        {/* Visual Progress Stepper */}
        {!isCancelled ? (
          <section className="my-12 border border-brand-primary/10 bg-brand-cream/40 p-8">
            <h2 className="text-[11px] uppercase tracking-[0.25em] text-brand-sage font-semibold mb-8">
              Dispatch Progression
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
              {steps.map((st, idx) => {
                const Icon = st.icon;
                const isPassed = currentIdx >= idx;
                const isCurrent = currentIdx === idx;

                return (
                  <div key={st.key} className="flex md:flex-col items-center md:items-center text-center gap-3">
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center transition-all ${
                        isCurrent
                          ? "bg-brand-primary text-brand-cream ring-4 ring-brand-oak/30 scale-105"
                          : isPassed
                            ? "bg-brand-oak text-brand-cream"
                            : "bg-brand-primary/10 text-brand-primary/40"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="text-left md:text-center">
                      <p
                        className={`text-xs font-semibold uppercase tracking-wider ${
                          isPassed ? "text-brand-primary" : "text-brand-primary/40"
                        }`}
                      >
                        {st.label}
                      </p>
                      {isCurrent && (
                        <span className="text-[10px] text-brand-oak font-semibold uppercase tracking-widest block mt-0.5">
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {order.trackingNumber && (
              <div className="mt-8 border-t border-brand-primary/10 pt-4 flex flex-wrap items-center justify-between text-xs">
                <div>
                  <span className="text-brand-primary/60">Carrier: </span>
                  <span className="font-semibold text-brand-primary">{order.carrier || "BlueDart Express Air"}</span>
                </div>
                <div>
                  <span className="text-brand-primary/60">Airway Bill / Tracking: </span>
                  <span className="font-mono font-semibold text-brand-oak">{order.trackingNumber}</span>
                </div>
              </div>
            )}
          </section>
        ) : (
          <div className="my-8 border border-red-500/30 bg-red-50 p-6 text-red-900">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} />
              <h3 className="font-serif text-lg font-semibold">Order Terminated</h3>
            </div>
            <p className="mt-2 text-xs">
              This order has been {order.status.toLowerCase()}. If you requested a refund, payment is typically reversed to source within 3-5 business banking days.
            </p>
          </div>
        )}

        {/* Order Details & Receipt Grid */}
        <div className="grid gap-12 lg:grid-cols-[1fr_360px]">
          {/* Purchased Items */}
          <section className="space-y-6">
            <h3 className="font-serif text-2xl text-brand-primary border-b border-brand-primary/10 pb-3">
              Ritual Artifacts ({order.items.length})
            </h3>

            <div className="divide-y divide-brand-primary/10 border-y border-brand-primary/10">
              {order.items.map((item) => (
                <div key={item.id} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-20 w-16 object-cover border border-brand-primary/10"
                    />
                    <div>
                      <Link to="/product/$slug" params={{ slug: item.slug }}>
                        <h4 className="font-serif text-xl text-brand-primary hover:text-brand-oak transition-colors">
                          {item.name}
                        </h4>
                      </Link>
                      <p className="text-xs text-brand-sage uppercase tracking-wider">SKU: {item.sku}</p>
                      <p className="text-xs text-brand-primary/70 mt-1">
                        Qty: {item.quantity} × {formatRupees(item.priceRupees)}
                      </p>
                    </div>
                  </div>

                  <span className="font-serif text-xl text-brand-primary">
                    {formatRupees(item.subtotalRupees)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <PrimaryButton onClick={handleReorder} className="inline-flex items-center gap-2 py-3 text-xs">
                <RotateCcw size={14} />
                <span>Reorder Items</span>
              </PrimaryButton>

              <Link to="/shop">
                <button className="border border-brand-primary/30 px-6 py-3 text-[11px] uppercase tracking-[0.2em] text-brand-primary hover:border-brand-primary">
                  Browse More Rituals
                </button>
              </Link>
            </div>
          </section>

          {/* Delivery & Financial Summary */}
          <aside className="space-y-8">
            {/* Delivery address */}
            {order.address && (
              <div className="border border-brand-primary/10 p-6 bg-brand-cream/50">
                <h4 className="text-[11px] uppercase tracking-[0.25em] text-brand-sage font-semibold mb-3">
                  Delivery Destination
                </h4>
                <div className="text-xs text-brand-primary/80 space-y-1">
                  <p className="font-semibold text-brand-primary text-sm">{order.address.name}</p>
                  <p>{order.address.line1}</p>
                  {order.address.line2 && <p>{order.address.line2}</p>}
                  <p>{order.address.city}, {order.address.region} - {order.address.postal}</p>
                  <p>{order.address.country}</p>
                  {order.address.phone && <p className="pt-2 text-brand-primary/60">Phone: {order.address.phone}</p>}
                </div>
              </div>
            )}

            {/* Invoice Breakdown */}
            <div className="border border-brand-primary/10 p-6 bg-brand-cream/50">
              <h4 className="text-[11px] uppercase tracking-[0.25em] text-brand-sage font-semibold mb-4 flex items-center gap-1.5">
                <Receipt size={14} />
                <span>Invoice Breakdown</span>
              </h4>

              <dl className="space-y-2.5 text-xs text-brand-primary/70">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-medium text-brand-primary">{formatRupees(order.subtotalRupees)}</dd>
                </div>

                {order.discountRupees > 0 && (
                  <div className="flex justify-between text-green-800 font-semibold">
                    <dt>Coupon Discount ({order.couponCode})</dt>
                    <dd>-{formatRupees(order.discountRupees)}</dd>
                  </div>
                )}

                <div className="flex justify-between">
                  <dt>Shipping</dt>
                  <dd className="font-medium text-brand-primary">
                    {order.shippingRupees === 0 ? "Complimentary" : formatRupees(order.shippingRupees)}
                  </dd>
                </div>

                <div className="flex justify-between">
                  <dt>GST (18%)</dt>
                  <dd className="font-medium text-brand-primary">{formatRupees(order.taxRupees)}</dd>
                </div>

                <div className="flex justify-between border-t border-brand-primary/10 pt-3 font-serif text-2xl text-brand-primary">
                  <dt>Total Paid</dt>
                  <dd>{formatRupees(order.totalRupees)}</dd>
                </div>
              </dl>

              {order.payment && (
                <div className="mt-4 border-t border-brand-primary/10 pt-3 text-[11px] text-brand-primary/60 space-y-1">
                  <p>Payment: <span className="font-semibold text-brand-primary">{order.payment.provider}</span> ({order.payment.status})</p>
                  {order.payment.reference && <p className="font-mono text-[10px]">Ref: {order.payment.reference}</p>}
                </div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </Shell>
  );
}
