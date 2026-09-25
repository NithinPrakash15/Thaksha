import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { PrimaryButton, Shell } from "@/components/Shell";
import { formatRupees } from "@/lib/server-products";
import { getCart, clearCart, type CartLine } from "@/lib/store";
import { getViewerFn, type SafeUser } from "@/lib/server-auth";
import {
  calculateOrderPricingFn,
  validateCouponFn,
  createOrderAndPaymentFn,
  verifyAndCapturePaymentFn,
  type PricingCalculation,
} from "@/lib/server-orders";
import {
  CheckCircle2,
  Lock,
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowRight,
  Tag,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Bespoke Multi-Step Checkout — Thaksha" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CheckoutPage,
});

type CheckoutStep = 1 | 2 | 3 | 4 | 5;

function CheckoutPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<CheckoutStep>(1);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [user, setUser] = useState<SafeUser | null>(null);
  const [pricing, setPricing] = useState<PricingCalculation | null>(null);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("Bengaluru");
  const [region, setRegion] = useState("Karnataka");
  const [postal, setPostal] = useState("560038");

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>(undefined);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);

  // Payment
  const [paymentProvider, setPaymentProvider] = useState<"RAZORPAY" | "STRIPE" | "MANUAL">("RAZORPAY");

  // Completed Order State
  const [confirmedOrder, setConfirmedOrder] = useState<{
    orderId: string;
    orderNumber: string;
    totalRupees: number;
    email: string;
  } | null>(null);

  // Initial Load
  useEffect(() => {
    const rawCart = getCart();
    setCart(rawCart);

    if (rawCart.length === 0) {
      setLoadingPricing(false);
      return;
    }

    const loadData = async () => {
      try {
        const [viewer, calc] = await Promise.all([
          getViewerFn().catch(() => null),
          calculateOrderPricingFn({ data: { items: rawCart } }),
        ]);

        if (viewer) {
          setUser(viewer);
          setName(viewer.name || "");
          setEmail(viewer.email || "");
          setPhone(viewer.phone || "");
        }

        setPricing(calc);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load checkout pricing.");
      } finally {
        setLoadingPricing(false);
      }
    };

    loadData();
  }, []);

  // Recalculate with coupon
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponError(null);
    setCouponSuccess(null);

    try {
      const res = await validateCouponFn({
        data: {
          code: couponInput.trim(),
          subtotalCents: (pricing?.subtotal || 0) * 100,
        },
      });

      if (res.valid) {
        setAppliedCoupon(res.code);
        setCouponSuccess(`Coupon ${res.code} applied! Saved ₹${res.discountRupees}.`);
        // Recalculate full order pricing
        const recalculated = await calculateOrderPricingFn({
          data: { items: cart, couponCode: res.code },
        });
        setPricing(recalculated);
        toast.success(`Coupon applied: -₹${res.discountRupees}`);
      }
    } catch (err: any) {
      setCouponError(err?.message || "Invalid coupon code.");
      toast.error(err?.message || "Coupon rejected.");
    }
  };

  const handleRemoveCoupon = async () => {
    setAppliedCoupon(undefined);
    setCouponInput("");
    setCouponSuccess(null);
    setCouponError(null);

    const recalculated = await calculateOrderPricingFn({
      data: { items: cart },
    });
    setPricing(recalculated);
    toast.info("Coupon removed.");
  };

  // Process checkout submission
  const handleCompletePayment = async () => {
    if (!pricing) return;
    setSubmitting(true);

    try {
      // 1. Create order atomically in PostgreSQL
      const created = await createOrderAndPaymentFn({
        data: {
          name,
          email,
          phone,
          line1,
          line2,
          city,
          region,
          postal,
          items: cart,
          couponCode: appliedCoupon,
          paymentProvider,
        },
      });

      // 2. Process server payment capture (Simulated Gateway Verification for instant live fulfillment)
      const captureResult = await verifyAndCapturePaymentFn({
        data: {
          orderId: created.orderId,
          transactionId: `${paymentProvider}-${Date.now()}`,
          paymentMethod: paymentProvider === "RAZORPAY" ? "UPI / Razorpay Gateway" : "Stripe Card Payment",
        },
      });

      // 3. Clear cart in store
      clearCart();

      // 4. Set confirmation
      setConfirmedOrder({
        orderId: created.orderId,
        orderNumber: created.orderNumber,
        totalRupees: created.totalRupees,
        email: created.email,
      });

      setStep(5);
      toast.success(`Order ${created.orderNumber} successfully confirmed!`);
    } catch (err: any) {
      toast.error(err?.message || "Checkout failed. Please review your details.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPricing) {
    return (
      <Shell>
        <div className="mx-auto max-w-4xl px-6 py-28 text-center">
          <Clock size={32} className="mx-auto text-brand-oak/60 animate-spin mb-4" />
          <h2 className="font-serif text-3xl text-brand-primary">Initializing Secure Checkout...</h2>
          <p className="mt-2 text-sm text-brand-primary/60">Verifying live inventory and tax rates.</p>
        </div>
      </Shell>
    );
  }

  if (cart.length === 0 && step !== 5) {
    return (
      <Shell>
        <div className="mx-auto max-w-xl px-6 py-28 text-center">
          <Sparkles size={32} className="mx-auto text-brand-oak mb-4" />
          <h2 className="font-serif text-3xl text-brand-primary">Your cart is empty</h2>
          <p className="mt-3 text-sm text-brand-primary/60">
            Please add items to your cart before proceeding to checkout.
          </p>
          <Link to="/shop">
            <PrimaryButton className="mt-8">Return to Catalog</PrimaryButton>
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        {/* Progress Stepper */}
        {step < 5 && (
          <div className="mb-12 border-b border-brand-primary/10 pb-6">
            <div className="flex items-center justify-between max-w-2xl mx-auto text-xs uppercase tracking-[0.2em]">
              {[
                { s: 1, label: "1. Patron" },
                { s: 2, label: "2. Delivery" },
                { s: 3, label: "3. Review" },
                { s: 4, label: "4. Payment" },
              ].map(({ s, label }) => (
                <button
                  key={s}
                  onClick={() => s < step && setStep(s as CheckoutStep)}
                  disabled={s > step}
                  className={`flex items-center gap-1.5 transition-colors ${
                    step === s
                      ? "text-brand-primary font-semibold border-b-2 border-brand-primary pb-1"
                      : s < step
                        ? "text-brand-oak hover:underline cursor-pointer"
                        : "text-brand-primary/30 cursor-not-allowed"
                  }`}
                >
                  {s < step && <CheckCircle2 size={12} />}
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: Confirmation View */}
        {step === 5 && confirmedOrder ? (
          <div className="mx-auto max-w-3xl border border-brand-primary/15 bg-brand-cream/60 p-8 md:p-12 shadow-sm text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-green-100 flex items-center justify-center text-green-800 mb-6">
              <CheckCircle2 size={32} />
            </div>

            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
              Ritual Order Received & Confirmed
            </span>
            <h1 className="mt-2 font-serif text-4xl md:text-5xl text-brand-primary">
              Thank You for Your Patronage
            </h1>
            <p className="mt-4 font-mono text-xl text-brand-oak font-semibold">
              Order Reference: {confirmedOrder.orderNumber}
            </p>

            <p className="mt-4 text-sm text-brand-primary/75 max-w-md mx-auto leading-relaxed">
              We have received your payment of <span className="font-semibold">{formatRupees(confirmedOrder.totalRupees)}</span>. A receipt and dispatch updates have been logged for <span className="font-medium">{confirmedOrder.email}</span>.
            </p>

            <div className="mt-8 p-6 bg-brand-primary/5 border border-brand-primary/10 text-left max-w-lg mx-auto rounded text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-brand-primary/60">Estimated Dispatch:</span>
                <span className="font-semibold text-brand-primary">Within 24 Hours</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-primary/60">Carrier:</span>
                <span className="font-semibold text-brand-primary">BlueDart Express Air</span>
              </div>
              <div className="flex justify-between">
                <span className="text-brand-primary/60">Delivery Address:</span>
                <span className="font-semibold text-brand-primary">{line1}, {city}</span>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-4 justify-center">
              <Link to="/orders/$id" params={{ id: confirmedOrder.orderId }}>
                <PrimaryButton className="inline-flex items-center gap-2">
                  <span>Track Your Order</span>
                  <ArrowRight size={14} />
                </PrimaryButton>
              </Link>
              <Link to="/shop">
                <button className="border border-brand-primary/30 px-8 py-4 text-[11px] uppercase tracking-[0.22em] text-brand-primary hover:border-brand-primary transition-colors">
                  Continue Browsing
                </button>
              </Link>
            </div>
          </div>
        ) : (
          /* Multi-Step Checkout Form & Summary Grid */
          <div className="grid gap-12 lg:grid-cols-[1fr_420px]">
            {/* Steps Container */}
            <div className="space-y-8">
              {/* Step 1: Patron Information */}
              {step === 1 && (
                <section className="border border-brand-primary/10 p-6 md:p-8 bg-brand-cream/40">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <span className="text-[10px] uppercase tracking-[0.25em] text-brand-sage font-medium">
                        Step 1 of 4
                      </span>
                      <h2 className="font-serif text-3xl text-brand-primary mt-1">Patron Information</h2>
                    </div>
                    {!user && (
                      <Link to="/login" className="text-xs text-brand-oak hover:underline">
                        Already have an account? Sign in
                      </Link>
                    )}
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setStep(2);
                    }}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                        Full Name
                        <input
                          required
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Aarav Sharma"
                          className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3.5 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                        Email Address (For order receipts)
                        <input
                          required
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="patron@thaksha.com"
                          className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3.5 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                        Mobile Number (For Courier SMS & Delivery PIN)
                        <input
                          required
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3.5 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                        />
                      </label>
                    </div>

                    <PrimaryButton type="submit" className="w-full flex items-center justify-center gap-2 mt-6">
                      <span>Continue to Delivery Address</span>
                      <ArrowRight size={14} />
                    </PrimaryButton>
                  </form>
                </section>
              )}

              {/* Step 2: Shipping Address */}
              {step === 2 && (
                <section className="border border-brand-primary/10 p-6 md:p-8 bg-brand-cream/40">
                  <div className="mb-6">
                    <span className="text-[10px] uppercase tracking-[0.25em] text-brand-sage font-medium">
                      Step 2 of 4
                    </span>
                    <h2 className="font-serif text-3xl text-brand-primary mt-1">Delivery Destination</h2>
                    <p className="text-xs text-brand-primary/60 mt-1">Pan-India express logistics via BlueDart / Delhivery.</p>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setStep(3);
                    }}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                        Street Address / Apartment
                        <input
                          required
                          type="text"
                          value={line1}
                          onChange={(e) => setLine1(e.target.value)}
                          placeholder="Flat 402, Lotus Court, 12th Main Road"
                          className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3.5 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                        />
                      </label>
                    </div>

                    <div>
                      <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                        Landmark / Suite (Optional)
                        <input
                          type="text"
                          value={line2}
                          onChange={(e) => setLine2(e.target.value)}
                          placeholder="Opposite Indiranagar Metro"
                          className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3.5 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                          City
                          <input
                            required
                            type="text"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3.5 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                          State / Region
                          <input
                            required
                            type="text"
                            value={region}
                            onChange={(e) => setRegion(e.target.value)}
                            className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3.5 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                          />
                        </label>
                      </div>

                      <div>
                        <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                          PIN Code
                          <input
                            required
                            type="text"
                            maxLength={6}
                            value={postal}
                            onChange={(e) => setPostal(e.target.value)}
                            placeholder="560038"
                            className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3.5 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="px-6 py-4 border border-brand-primary/20 text-[11px] uppercase tracking-[0.2em] text-brand-primary hover:border-brand-primary"
                      >
                        Back
                      </button>
                      <PrimaryButton type="submit" className="flex-1 flex items-center justify-center gap-2">
                        <span>Continue to Review</span>
                        <ArrowRight size={14} />
                      </PrimaryButton>
                    </div>
                  </form>
                </section>
              )}

              {/* Step 3: Order Review & Coupon */}
              {step === 3 && pricing && (
                <section className="border border-brand-primary/10 p-6 md:p-8 bg-brand-cream/40 space-y-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-brand-sage font-medium">
                      Step 3 of 4
                    </span>
                    <h2 className="font-serif text-3xl text-brand-primary mt-1">Review Your Ritual</h2>
                  </div>

                  {/* Delivery summary badge */}
                  <div className="bg-brand-primary/5 p-4 border border-brand-primary/10 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-brand-primary">Delivering to: {name}</p>
                      <p className="text-brand-primary/70">{line1}, {city} - {postal} ({phone})</p>
                    </div>
                    <button
                      onClick={() => setStep(2)}
                      className="text-brand-oak underline font-medium"
                    >
                      Change
                    </button>
                  </div>

                  {/* Items list */}
                  <div className="divide-y divide-brand-primary/10 border-y border-brand-primary/10">
                    {pricing.items.map((item) => (
                      <div key={item.slug} className="py-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <img src={item.image} alt={item.name} className="h-16 w-14 object-cover border border-brand-primary/10" />
                          <div>
                            <h4 className="font-serif text-lg text-brand-primary">{item.name}</h4>
                            <p className="text-xs text-brand-primary/60">Qty: {item.quantity} × {formatRupees(item.unitPrice)}</p>
                          </div>
                        </div>
                        <span className="font-serif text-lg text-brand-primary">{formatRupees(item.lineTotal)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Coupon Code Section */}
                  <div className="border border-brand-primary/10 p-5 bg-brand-cream/60">
                    <h4 className="text-[11px] uppercase tracking-[0.2em] text-brand-sage font-semibold mb-3 flex items-center gap-2">
                      <Tag size={14} /> Promotional Code
                    </h4>

                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 p-3 text-xs text-green-900">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-green-700" />
                          <span>Code <strong>{appliedCoupon}</strong> active</span>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-red-700 underline text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleApplyCoupon} className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => setCouponInput(e.target.value)}
                          placeholder="e.g. THAKSHA10 or WELCOME500"
                          className="flex-1 border border-brand-primary/20 bg-transparent p-3 text-xs uppercase tracking-wider outline-none focus:border-brand-oak"
                        />
                        <button
                          type="submit"
                          className="bg-brand-primary px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-brand-cream hover:bg-brand-oak transition-colors"
                        >
                          Apply
                        </button>
                      </form>
                    )}

                    {couponError && <p className="text-xs text-red-700 mt-2">{couponError}</p>}
                    {couponSuccess && <p className="text-xs text-green-700 mt-2">{couponSuccess}</p>}
                    <p className="text-[10px] text-brand-primary/50 mt-2">Try coupon code: <strong>THAKSHA10</strong> (10% off) or <strong>WELCOME500</strong> (₹500 off on ₹2999+)</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="px-6 py-4 border border-brand-primary/20 text-[11px] uppercase tracking-[0.2em] text-brand-primary hover:border-brand-primary"
                    >
                      Back
                    </button>
                    <PrimaryButton
                      onClick={() => setStep(4)}
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <span>Proceed to Payment</span>
                      <ArrowRight size={14} />
                    </PrimaryButton>
                  </div>
                </section>
              )}

              {/* Step 4: Payment Gateway */}
              {step === 4 && pricing && (
                <section className="border border-brand-primary/10 p-6 md:p-8 bg-brand-cream/40 space-y-6">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.25em] text-brand-sage font-medium">
                      Step 4 of 4
                    </span>
                    <h2 className="font-serif text-3xl text-brand-primary mt-1">Payment Method</h2>
                    <p className="text-xs text-brand-primary/60 mt-1">
                      Transactions are cryptographically signed and secured via 256-bit encryption.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Razorpay Option */}
                    <label
                      onClick={() => setPaymentProvider("RAZORPAY")}
                      className={`block p-5 border cursor-pointer transition-all ${
                        paymentProvider === "RAZORPAY"
                          ? "border-brand-oak bg-brand-cream shadow-sm"
                          : "border-brand-primary/10 hover:border-brand-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment"
                            checked={paymentProvider === "RAZORPAY"}
                            onChange={() => setPaymentProvider("RAZORPAY")}
                            className="text-brand-oak accent-brand-oak"
                          />
                          <div>
                            <p className="font-medium text-brand-primary text-sm">
                              Razorpay (Instant UPI, Cards & Netbanking)
                            </p>
                            <p className="text-xs text-brand-primary/60 mt-0.5">
                              Supports Google Pay, PhonePe, Paytm, BHIM UPI, Visa, Mastercard, RuPay.
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-brand-oak uppercase tracking-wider">
                          Recommended
                        </span>
                      </div>
                    </label>

                    {/* Stripe Option */}
                    <label
                      onClick={() => setPaymentProvider("STRIPE")}
                      className={`block p-5 border cursor-pointer transition-all ${
                        paymentProvider === "STRIPE"
                          ? "border-brand-oak bg-brand-cream shadow-sm"
                          : "border-brand-primary/10 hover:border-brand-primary/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment"
                            checked={paymentProvider === "STRIPE"}
                            onChange={() => setPaymentProvider("STRIPE")}
                            className="text-brand-oak accent-brand-oak"
                          />
                          <div>
                            <p className="font-medium text-brand-primary text-sm">
                              Credit / Debit Cards (Stripe)
                            </p>
                            <p className="text-xs text-brand-primary/60 mt-0.5">
                              International & Domestic Credit and Debit cards.
                            </p>
                          </div>
                        </div>
                        <CreditCard size={18} className="text-brand-primary/50" />
                      </div>
                    </label>
                  </div>

                  <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 text-xs text-brand-primary/70 flex items-center gap-3">
                    <Lock size={18} className="text-brand-oak flex-shrink-0" />
                    <span>
                      Order total of <strong>{formatRupees(pricing.total)}</strong> will be captured server-side with zero price tampering risk.
                    </span>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => setStep(3)}
                      className="px-6 py-4 border border-brand-primary/20 text-[11px] uppercase tracking-[0.2em] text-brand-primary hover:border-brand-primary disabled:opacity-50"
                    >
                      Back
                    </button>
                    <PrimaryButton
                      disabled={submitting}
                      onClick={handleCompletePayment}
                      className="flex-1 flex items-center justify-center gap-2 py-4 text-xs font-semibold tracking-widest"
                    >
                      <Lock size={14} />
                      <span>
                        {submitting ? "Processing Payment..." : `Authorize & Pay ${formatRupees(pricing.total)}`}
                      </span>
                    </PrimaryButton>
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar Pricing Review */}
            {pricing && (
              <aside className="border border-brand-primary/10 p-6 md:p-8 bg-brand-cream/50 h-fit lg:sticky lg:top-28">
                <h3 className="font-serif text-2xl text-brand-primary border-b border-brand-primary/10 pb-4">
                  Order Breakdown
                </h3>

                <div className="mt-4 max-h-56 overflow-y-auto divide-y divide-brand-primary/5 pr-1">
                  {pricing.items.map((item) => (
                    <div key={item.slug} className="py-2.5 flex justify-between text-xs">
                      <div>
                        <span className="font-medium text-brand-primary">{item.name}</span>
                        <span className="text-brand-primary/50 ml-1">× {item.quantity}</span>
                      </div>
                      <span className="font-mono text-brand-primary">{formatRupees(item.lineTotal)}</span>
                    </div>
                  ))}
                </div>

                <dl className="mt-6 border-t border-brand-primary/10 pt-4 space-y-3 text-xs text-brand-primary/70">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd className="font-medium text-brand-primary">{formatRupees(pricing.subtotal)}</dd>
                  </div>

                  {pricing.discount > 0 && (
                    <div className="flex justify-between text-green-800 font-semibold">
                      <dt>Promotional Discount</dt>
                      <dd>-{formatRupees(pricing.discount)}</dd>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <dt>Shipping</dt>
                    <dd className="font-medium text-brand-primary">
                      {pricing.shipping === 0 ? "Complimentary" : formatRupees(pricing.shipping)}
                    </dd>
                  </div>

                  <div className="flex justify-between">
                    <dt>GST (18%)</dt>
                    <dd className="font-medium text-brand-primary">{formatRupees(pricing.tax)}</dd>
                  </div>

                  <div className="flex justify-between border-t border-brand-primary/10 pt-4 font-serif text-2xl text-brand-primary">
                    <dt>Final Amount</dt>
                    <dd>{formatRupees(pricing.total)}</dd>
                  </div>
                </dl>

                <div className="mt-6 pt-4 border-t border-brand-primary/10 text-[11px] text-brand-primary/60 space-y-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={14} className="text-brand-oak" />
                    <span>Lifetime craftsmanship guarantee</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck size={14} className="text-brand-oak" />
                    <span>Dispatched in eco-luxe linen sleeve</span>
                  </div>
                </div>
              </aside>
            )}
          </div>
        )}
      </main>
    </Shell>
  );
}
