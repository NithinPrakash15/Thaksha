import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { Heart, Share2, Truck, ShieldCheck, Star, Sparkles, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { PrimaryButton, Shell } from "@/components/Shell";
import { formatRupees, getProductBySlugFn, getCatalogProductsFn, submitProductReviewFn, type DbProductDetail } from "@/lib/server-products";
import { addToCart, toggleWishlist, getWishlist } from "@/lib/store";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params }) => {
    const product = await getProductBySlugFn({ data: params.slug });
    if (!product) throw notFound();

    // Fetch related products for the bottom section
    const catalog = await getCatalogProductsFn();
    const related = (catalog?.products || [])
      .filter((p) => p.slug !== params.slug)
      .slice(0, 3);

    return { product, related };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.product?.name || "Ritual"} — Thaksha Neem Wood` },
      { name: "description", content: loaderData?.product?.description || "Hand-carved neem wood grooming tools." },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const { product, related } = Route.useLoaderData();
  const [activeImage, setActiveImage] = useState(product.gallery[0] || product.image);
  const [quantity, setQuantity] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);

  // Review submission state
  const [reviewsList, setReviewsList] = useState(product.reviews);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [revRating, setRevRating] = useState(5);
  const [revTitle, setRevTitle] = useState("");
  const [revBody, setRevBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setActiveImage(product.gallery[0] || product.image);
    const syncWishlist = () => setInWishlist(getWishlist().includes(product.slug));
    syncWishlist();
    window.addEventListener("thaksha:store", syncWishlist);
    return () => window.removeEventListener("thaksha:store", syncWishlist);
  }, [product]);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

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
        inventory: product.stock,
        sku: product.sku,
        category: product.category,
        color: "Natural Neem",
        size: "Standard",
        gallery: product.gallery,
        benefits: product.benefits,
        specs: product.specs,
      },
      quantity,
    );
    toast.success(`Added ${quantity} × ${product.name} to your cart.`);
  };

  const handleToggleWishlist = () => {
    toggleWishlist(product.slug);
    toast.success(
      inWishlist ? `Removed ${product.name} from wishlist.` : `Saved ${product.name} to wishlist.`,
    );
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${product.name} — Thaksha`,
          text: product.tagline || product.description,
          url: window.location.href,
        });
      } catch {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product link copied to clipboard!");
    }
  };

  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-6 py-12 md:px-10">
        {/* Breadcrumbs */}
        <nav className="mb-8 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-brand-primary/50">
          <Link to="/" className="hover:text-brand-primary">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-brand-primary">Catalog</Link>
          <span>/</span>
          <span className="text-brand-primary font-medium">{product.name}</span>
        </nav>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Gallery View */}
          <section>
            <div className="relative aspect-[4/5] overflow-hidden bg-brand-sage-soft/30 border border-brand-primary/5">
              <img
                src={activeImage}
                alt={product.name}
                className="h-full w-full object-cover transition-all duration-500"
              />

              <div className="absolute top-4 left-4">
                {isOutOfStock ? (
                  <span className="bg-red-800 text-brand-cream px-3 py-1 text-[10px] uppercase tracking-[0.22em]">
                    Sold Out
                  </span>
                ) : isLowStock ? (
                  <span className="bg-amber-700 text-brand-cream px-3 py-1 text-[10px] uppercase tracking-[0.22em]">
                    Only {product.stock} Units Remaining
                  </span>
                ) : (
                  <span className="bg-brand-cream/95 text-brand-primary px-3 py-1 text-[10px] uppercase tracking-[0.22em] shadow-sm">
                    In Stock
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnail selector */}
            {product.gallery.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {product.gallery.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImage(item)}
                    className={`aspect-square w-20 flex-shrink-0 overflow-hidden border-2 transition-all ${
                      activeImage === item ? "border-brand-oak scale-95" : "border-brand-primary/10 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={item} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Value Props */}
            <div className="mt-8 grid grid-cols-2 gap-4 border-t border-brand-primary/10 pt-6 text-xs text-brand-primary/70">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-brand-oak" />
                <span>Express Pan-India Delivery (2-4 Days)</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-brand-oak" />
                <span>Seasoned Solid Neem (Lifetime Form)</span>
              </div>
            </div>
          </section>

          {/* Product Details & Actions */}
          <section className="lg:sticky lg:top-28 lg:self-start">
            <p className="text-[11px] uppercase tracking-[0.28em] text-brand-sage font-medium">
              {product.category} • SKU: {product.sku}
            </p>

            <h1 className="mt-4 font-serif text-5xl md:text-6xl text-brand-primary leading-tight">
              {product.name}
            </h1>

            {product.tagline && (
              <p className="mt-2 text-lg text-brand-primary/70 font-sans">{product.tagline}</p>
            )}

            {/* Pricing */}
            <div className="mt-6 flex items-baseline gap-4">
              <span className="font-serif text-4xl text-brand-primary">
                {formatRupees(product.price)}
              </span>
              {product.compareAt && (
                <span className="text-sm text-brand-primary/40 line-through">
                  {formatRupees(product.compareAt)}
                </span>
              )}
              {product.compareAt && (
                <span className="text-xs uppercase tracking-wider text-green-700 bg-green-50 px-2 py-0.5 border border-green-200">
                  Save {formatRupees(product.compareAt - product.price)}
                </span>
              )}
            </div>

            <p className="mt-6 text-base leading-relaxed text-brand-primary/75">
              {product.description}
            </p>

            {/* Key Benefits */}
            {product.benefits && product.benefits.length > 0 && (
              <div className="mt-8 border border-brand-primary/10 bg-brand-cream/40 p-5">
                <h3 className="text-[11px] uppercase tracking-[0.25em] text-brand-sage font-semibold mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} /> Ritual Benefits
                </h3>
                <ul className="grid gap-2 text-sm text-brand-primary/80">
                  {product.benefits.map((b, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="text-brand-oak mt-1 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quantity & Add to Cart */}
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <div className="w-full sm:w-28">
                <label className="block text-[10px] uppercase tracking-[0.2em] text-brand-primary mb-1 font-medium">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  max={Math.min(product.stock || 10, 10)}
                  value={quantity}
                  disabled={isOutOfStock}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full border border-brand-primary/20 bg-transparent p-4 text-center text-sm font-semibold outline-none focus:border-brand-oak"
                />
              </div>

              <div className="flex-1 self-end">
                <PrimaryButton
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="w-full py-4 text-xs flex items-center justify-center gap-2"
                >
                  {isOutOfStock ? "Out of Stock (Join Waitlist)" : `Add to Cart — ${formatRupees(product.price * quantity)}`}
                </PrimaryButton>
              </div>
            </div>

            {/* Secondary actions */}
            <div className="mt-6 flex items-center gap-6 text-[11px] uppercase tracking-[0.2em] text-brand-primary">
              <button
                type="button"
                onClick={handleToggleWishlist}
                className="inline-flex items-center gap-1.5 hover:text-brand-oak transition-colors"
              >
                <Heart size={15} className={inWishlist ? "fill-red-700 text-red-700" : ""} />
                <span>{inWishlist ? "Saved in Sanctuary" : "Add to Wishlist"}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 hover:text-brand-oak transition-colors"
              >
                <Share2 size={15} />
                <span>Share Ritual</span>
              </button>
            </div>

            {/* Specifications Table */}
            {product.specs && Object.keys(product.specs).length > 0 && (
              <div className="mt-10 border-t border-brand-primary/10 pt-6">
                <h3 className="text-[11px] uppercase tracking-[0.25em] text-brand-sage font-semibold mb-4">
                  Craftsmanship Specifications
                </h3>
                <dl className="divide-y divide-brand-primary/10">
                  {Object.entries(product.specs).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-3 text-sm">
                      <dt className="text-brand-primary/60">{key}</dt>
                      <dd className="font-medium text-brand-primary text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </section>
        </div>

        {/* Customer Reviews Section */}
        <section className="mt-20 border-t border-brand-primary/10 pt-16">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
            <div>
              <span className="text-[11px] uppercase tracking-[0.25em] text-brand-sage font-medium">
                Verified Feedback
              </span>
              <h2 className="mt-2 font-serif text-4xl text-brand-primary">
                Patron Impressions ({reviewsList.length})
              </h2>
            </div>

            <button
              onClick={() => setShowReviewModal(true)}
              className="bg-brand-primary text-brand-cream px-6 py-3 text-[11px] uppercase tracking-[0.2em] hover:bg-brand-oak transition-colors self-start md:self-auto"
            >
              Write Patron Impression
            </button>
          </div>

          {reviewsList.length === 0 ? (
            <div className="border border-brand-primary/10 p-10 text-center bg-brand-cream/30">
              <Star size={24} className="mx-auto text-brand-oak/40 mb-2" />
              <p className="font-serif text-2xl text-brand-primary">No published reviews yet.</p>
              <p className="mt-2 text-sm text-brand-primary/60 max-w-md mx-auto">
                Be the first to share your grooming ritual after purchase. All patron reviews are verified against confirmed deliveries.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {reviewsList.map((rev) => (
                <div key={rev.id} className="border border-brand-primary/10 p-6 bg-brand-cream/50">
                  <div className="flex items-center gap-1 text-brand-oak mb-2">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} size={14} className="fill-brand-oak" />
                    ))}
                    {rev.isVerified && (
                      <span className="ml-2 text-[9px] uppercase tracking-wider text-green-800 bg-green-100 px-2 py-0.5 rounded font-semibold border border-green-200">
                        Verified Patron
                      </span>
                    )}
                  </div>
                  <h4 className="font-serif text-lg text-brand-primary">{rev.title}</h4>
                  <p className="mt-2 text-sm text-brand-primary/70 leading-relaxed">{rev.body}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-brand-primary/50 border-t border-brand-primary/5 pt-3">
                    <span className="font-medium text-brand-primary/80">{rev.userName}</span>
                    <span>{rev.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* REVIEW SUBMISSION MODAL */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-brand-cream border border-brand-primary/20 p-8 max-w-lg w-full shadow-2xl rounded">
              <div className="flex justify-between items-center border-b border-brand-primary/10 pb-4 mb-6">
                <h3 className="font-serif text-3xl text-brand-primary">Share Your Impression</h3>
                <button onClick={() => setShowReviewModal(false)} className="text-brand-primary/60 hover:text-brand-primary">
                  ✕
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmittingReview(true);
                  try {
                    const res = await submitProductReviewFn({
                      data: {
                        productId: product.id,
                        rating: revRating,
                        title: revTitle,
                        body: revBody,
                      },
                    });

                    toast.success("Impression submitted! Thank you for your feedback.");
                    setReviewsList((prev) => [
                      {
                        id: res.reviewId,
                        rating: revRating,
                        title: revTitle,
                        body: revBody,
                        createdAt: "Just now",
                        userName: "You",
                        isVerified: res.isVerified,
                      },
                      ...prev,
                    ]);
                    setShowReviewModal(false);
                    setRevTitle("");
                    setRevBody("");
                  } catch (err: any) {
                    toast.error(err?.message || "Failed to submit review.");
                  } finally {
                    setSubmittingReview(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                    Rating
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setRevRating(star)}
                        className="p-1 text-brand-oak"
                      >
                        <Star
                          size={24}
                          className={star <= revRating ? "fill-brand-oak text-brand-oak" : "text-brand-primary/30"}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                    Headline / Summary
                    <input
                      required
                      type="text"
                      value={revTitle}
                      onChange={(e) => setRevTitle(e.target.value)}
                      placeholder="e.g. Exceptional finish and scalp stimulation"
                      className="mt-1 block w-full border border-brand-primary/20 bg-transparent p-3 text-sm outline-none focus:border-brand-oak"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] uppercase tracking-[0.2em] text-brand-primary mb-1">
                    Detailed Impression
                    <textarea
                      required
                      rows={4}
                      value={revBody}
                      onChange={(e) => setRevBody(e.target.value)}
                      placeholder="Describe your ritual experience, tooth glide, and wood scent..."
                      className="mt-1 block w-full border border-brand-primary/20 bg-transparent p-3 text-sm outline-none focus:border-brand-oak"
                    />
                  </label>
                </div>

                <div className="flex gap-4 pt-4 border-t border-brand-primary/10">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(false)}
                    className="px-6 py-3 border border-brand-primary/20 text-xs uppercase tracking-wider"
                  >
                    Cancel
                  </button>
                  <PrimaryButton disabled={submittingReview} className="flex-1 py-3">
                    {submittingReview ? "Submitting..." : "Publish Impression"}
                  </PrimaryButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Frequently bought together / related */}
        {related && related.length > 0 && (
          <section className="mt-20 border-t border-brand-primary/10 pt-16">
            <div className="mb-8">
              <span className="text-[11px] uppercase tracking-[0.25em] text-brand-sage font-medium">
                Complete the Experience
              </span>
              <h2 className="mt-2 font-serif text-4xl text-brand-primary">
                Complementary Rituals
              </h2>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  to="/product/$slug"
                  params={{ slug: item.slug }}
                  className="group border border-brand-primary/10 p-4 flex gap-4 items-center bg-brand-cream/40 hover:border-brand-oak transition-colors"
                >
                  <img src={item.image} alt={item.name} className="h-20 w-16 object-cover flex-shrink-0" />
                  <div>
                    <h3 className="font-serif text-lg text-brand-primary group-hover:text-brand-oak transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-brand-sage">{item.category}</p>
                    <p className="mt-1 font-serif text-sm text-brand-primary">{formatRupees(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </Shell>
  );
}
