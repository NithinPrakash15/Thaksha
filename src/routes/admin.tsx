import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getViewerFn, logoutUserFn, loginAdminFn, type SafeUser } from "@/lib/server-auth";
import {
  getAdminMetricsFn,
  getAdminProductsFn,
  createAdminProductFn,
  updateAdminProductFn,
  updateInventoryStockFn,
  getAdminOrdersFn,
  updateAdminOrderStatusFn,
  getAdminCustomersFn,
  getAdminCouponsFn,
  createAdminCouponFn,
  getAdminAuditLogsFn,
  getAdminReviewsFn,
  moderateAdminReviewFn,
  getAdminStoreSettingsFn,
  updateAdminStoreSettingFn,
} from "@/lib/server-admin";
import { formatRupees } from "@/lib/server-products";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Tag,
  ShieldAlert,
  LogOut,
  ExternalLink,
  Plus,
  Edit,
  Save,
  X,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  TrendingUp,
  Star,
  Sliders,
  Check,
  RotateCcw,
  Trash2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/admin")({
  loader: async () => {
    try {
      const user = await getViewerFn().catch(() => null);
      if (!user || user.role !== "ADMIN") {
        return { adminUser: null, initialMetrics: null };
      }
      const metrics = await getAdminMetricsFn().catch(() => null);
      return { adminUser: user, initialMetrics: metrics };
    } catch {
      return { adminUser: null, initialMetrics: null };
    }
  },
  head: () => ({
    meta: [
      { title: "Operations Console — Thaksha Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboardPage,
});

type AdminTab = "overview" | "products" | "inventory" | "orders" | "customers" | "coupons" | "reviews" | "settings" | "audit";

function AdminDashboardPage() {
  const loaderData = Route.useLoaderData();
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(loaderData?.adminUser || null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [metrics, setMetrics] = useState(loaderData?.initialMetrics || null);

  // Embedded Authentication State for Unauthenticated Visitors
  const [loginEmail, setLoginEmail] = useState("admin@thaksha.com");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleInlineLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await loginAdminFn({
        data: { email: loginEmail, password: loginPassword },
      });

      if (res.success && res.user) {
        toast.success("Administrator credentials verified.");
        setCurrentUser(res.user);
        window.dispatchEvent(new Event("thaksha:auth"));
        const freshMetrics = await getAdminMetricsFn().catch(() => null);
        setMetrics(freshMetrics);
      }
    } catch (err: any) {
      setLoginError(err?.message || "Invalid credentials.");
      toast.error(err?.message || "Authentication rejected");
    } finally {
      setLoginLoading(false);
    }
  };

  // Products state
  const [productsData, setProductsData] = useState<{ products: any[]; categories: any[] }>({
    products: [],
    categories: [],
  });
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // New Product Form
  const [newProdName, setNewProdName] = useState("");
  const [newProdSlug, setNewProdSlug] = useState("");
  const [newProdTagline, setNewProdTagline] = useState("");
  const [newProdDescription, setNewProdDescription] = useState("");
  const [newProdSku, setNewProdSku] = useState("");
  const [newProdPrice, setNewProdPrice] = useState(3999);
  const [newProdCompareAt, setNewProdCompareAt] = useState<number | undefined>(undefined);
  const [newProdStock, setNewProdStock] = useState(25);
  const [newProdCategory, setNewProdCategory] = useState("");
  const [newProdImageUrl, setNewProdImageUrl] = useState("/assets/hero-comb.jpg");
  const [newProdBenefits, setNewProdBenefits] = useState("Handmade from seasoned neem wood\nScalp wellness stimulation");

  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string>("PROCESSING");
  const [carrierInput, setCarrierInput] = useState("BlueDart Express Air");
  const [trackingInput, setTrackingInput] = useState("");

  // Customers state
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Coupons state
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [newCouponValue, setNewCouponValue] = useState(10);
  const [newCouponMinOrder, setNewCouponMinOrder] = useState(999);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Reviews state
  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");

  // Store Settings state
  const [storeSettings, setStoreSettings] = useState<any[]>([]);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettingKey, setSavingSettingKey] = useState<string | null>(null);
  const [editingSettings, setEditingSettings] = useState<Record<string, string>>({});

  // Load Tab-specific data
  useEffect(() => {
    if (activeTab === "products" || activeTab === "inventory") {
      setLoadingProducts(true);
      getAdminProductsFn()
        .then((res) => {
          setProductsData(res);
          if (res.categories.length > 0 && !newProdCategory) {
            setNewProdCategory(res.categories[0].id);
          }
        })
        .finally(() => setLoadingProducts(false));
    } else if (activeTab === "orders") {
      setLoadingOrders(true);
      getAdminOrdersFn()
        .then((res) => setOrders(res))
        .finally(() => setLoadingOrders(false));
    } else if (activeTab === "customers") {
      setLoadingCustomers(true);
      getAdminCustomersFn()
        .then((res) => setCustomers(res))
        .finally(() => setLoadingCustomers(false));
    } else if (activeTab === "coupons") {
      setLoadingCoupons(true);
      getAdminCouponsFn()
        .then((res) => setCoupons(res))
        .finally(() => setLoadingCoupons(false));
    } else if (activeTab === "reviews") {
      setLoadingReviews(true);
      getAdminReviewsFn()
        .then((res) => setReviews(res))
        .finally(() => setLoadingReviews(false));
    } else if (activeTab === "settings") {
      setLoadingSettings(true);
      getAdminStoreSettingsFn()
        .then((res) => {
          setStoreSettings(res);
          const initialVals: Record<string, string> = {};
          res.forEach((s) => {
            initialVals[s.key] = s.value;
          });
          setEditingSettings(initialVals);
        })
        .finally(() => setLoadingSettings(false));
    } else if (activeTab === "audit") {
      getAdminAuditLogsFn().then((res) => setAuditLogs(res));
    } else if (activeTab === "overview") {
      getAdminMetricsFn().then((res) => setMetrics(res));
    }
  }, [activeTab]);

  const handleModerateReview = async (reviewId: string, action: "APPROVE" | "UNAPPROVE" | "DELETE") => {
    try {
      await moderateAdminReviewFn({ data: { reviewId, action } });
      toast.success(action === "DELETE" ? "Review removed permanently." : `Review marked as ${action.toLowerCase()}d.`);
      const res = await getAdminReviewsFn();
      setReviews(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to moderate review.");
    }
  };

  const handleSaveSetting = async (key: string, description: string) => {
    try {
      setSavingSettingKey(key);
      const value = editingSettings[key] ?? "";
      await updateAdminStoreSettingFn({ data: { key, value, description } });
      toast.success(`Updated setting: ${key}`);
      const res = await getAdminStoreSettingsFn();
      setStoreSettings(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update setting.");
    } finally {
      setSavingSettingKey(null);
    }
  };

  const handleLogout = async () => {
    await logoutUserFn();
    setCurrentUser(null);
    toast.success("Admin session terminated.");
  };

  // Create Product handler
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const benefits = newProdBenefits
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean);

      await createAdminProductFn({
        data: {
          name: newProdName,
          slug: newProdSlug || newProdName.toLowerCase().replace(/\s+/g, "-"),
          tagline: newProdTagline,
          description: newProdDescription,
          sku: newProdSku,
          priceRupees: Number(newProdPrice),
          compareAtRupees: newProdCompareAt ? Number(newProdCompareAt) : undefined,
          stock: Number(newProdStock),
          categoryId: newProdCategory || undefined,
          status: "PUBLISHED",
          isFeatured: true,
          imageUrl: newProdImageUrl,
          benefits,
        },
      });

      toast.success("Product created successfully.");
      setShowCreateProductModal(false);
      // Reload products
      const res = await getAdminProductsFn();
      setProductsData(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create product.");
    }
  };

  // Update Product handler
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      await updateAdminProductFn({
        data: {
          id: editingProduct.id,
          name: editingProduct.name,
          tagline: editingProduct.tagline,
          description: editingProduct.description,
          priceRupees: Number(editingProduct.priceRupees),
          compareAtRupees: editingProduct.compareAtRupees ? Number(editingProduct.compareAtRupees) : undefined,
          stock: Number(editingProduct.stock),
          categoryId: editingProduct.categoryId,
          status: editingProduct.status,
          isFeatured: editingProduct.isFeatured,
        },
      });

      toast.success("Product updated.");
      setEditingProduct(null);
      const res = await getAdminProductsFn();
      setProductsData(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update product.");
    }
  };

  // Quick stock adjustment
  const handleStockAdjust = async (productId: string, newStock: number) => {
    try {
      await updateInventoryStockFn({ data: { productId, newStock } });
      setProductsData((prev) => ({
        ...prev,
        products: prev.products.map((p) => (p.id === productId ? { ...p, stock: newStock } : p)),
      }));
      toast.success("Inventory stock updated.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to adjust stock.");
    }
  };

  // Update order status handler
  const handleUpdateOrderStatus = async () => {
    if (!selectedOrder) return;
    try {
      await updateAdminOrderStatusFn({
        data: {
          orderId: selectedOrder.id,
          status: updatingStatus as any,
          carrier: carrierInput,
          trackingNumber: trackingInput,
        },
      });

      toast.success(`Order ${selectedOrder.orderNumber} updated to ${updatingStatus}.`);
      setSelectedOrder(null);
      const res = await getAdminOrdersFn();
      setOrders(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update order status.");
    }
  };

  // Create coupon handler
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAdminCouponFn({
        data: {
          code: newCouponCode,
          discountType: newCouponType,
          discountValue: Number(newCouponValue),
          minOrderRupees: Number(newCouponMinOrder),
        },
      });

      toast.success(`Coupon ${newCouponCode.toUpperCase()} created.`);
      setNewCouponCode("");
      const res = await getAdminCouponsFn();
      setCoupons(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create coupon.");
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter === "ALL") return true;
    return o.status === orderStatusFilter;
  });

  const filteredProducts = productsData.products.filter((p) => {
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q);
  });

  if (!currentUser || currentUser.role !== "ADMIN") {
    return (
      <div className="min-h-screen bg-[#141210] text-[#EFECE6] font-sans flex items-center justify-center p-4">
        <Toaster richColors position="top-right" />
        <div className="w-full max-w-md border border-[#2C2825] bg-[#1B1816] p-8 rounded shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <img src="/thaksha-logo.png" alt="Thaksha" className="h-8 w-8 object-contain" />
            <span className="font-serif text-2xl font-bold tracking-wider text-[#C59B63] uppercase">Thaksha</span>
            <span className="text-[10px] uppercase tracking-widest text-[#9D968D] bg-[#2A2521] px-2 py-0.5 rounded border border-[#3E3832] ml-auto">
              Security Gate
            </span>
          </div>
          <h2 className="font-serif text-3xl text-[#EFECE6] mb-1">Operations Console</h2>
          <p className="text-xs text-[#9D968D] mb-6">Sign in with administrator credentials to manage your store.</p>

          {loginError && (
            <div className="mb-4 border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300 rounded">
              {loginError}
            </div>
          )}

          <form onSubmit={handleInlineLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">Admin Email</label>
              <input
                required
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">Password</label>
              <input
                required
                type="password"
                placeholder="••••••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-[#C59B63] hover:bg-[#b0874e] text-[#1B1816] py-3 rounded font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 text-xs"
            >
              {loginLoading ? "Verifying Session..." : "Enter Operations Console"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#151311] text-[#EFECE6] font-sans flex flex-col">
      <Toaster richColors position="top-right" />

      {/* Admin Header */}
      <header className="border-b border-[#2C2825] bg-[#1B1816] px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 text-[#EFECE6] hover:text-[#C59B63] transition-colors">
            <img src="/thaksha-logo.png" alt="Thaksha" className="h-8 w-8 object-contain" />
            <span className="font-serif text-xl uppercase tracking-wider font-semibold">Thaksha</span>
          </Link>
          <span className="text-xs uppercase tracking-widest text-[#9D968D] bg-[#2A2521] px-2 py-0.5 rounded border border-[#3E3832]">
            Operations Console
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            to="/"
            target="_blank"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#C59B63] hover:underline"
          >
            <span>Live Storefront</span>
            <ExternalLink size={12} />
          </Link>

          <div className="text-right hidden md:block">
            <p className="text-xs font-semibold">{currentUser.name || "Administrator"}</p>
            <p className="text-[10px] text-[#9D968D]">{currentUser.email}</p>
          </div>

          <button
            onClick={handleLogout}
            className="border border-[#3E3832] hover:border-red-500/50 p-2 text-[#9D968D] hover:text-red-400 transition-colors rounded"
            title="Terminate Session"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-64 border-r border-[#2C2825] bg-[#191614] p-4 flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "products", label: "Products Catalog", icon: Package },
            { id: "inventory", label: "Inventory Stock", icon: Layers },
            { id: "orders", label: "Orders & Dispatch", icon: ShoppingBag },
            { id: "customers", label: "Patrons Directory", icon: Users },
            { id: "coupons", label: "Promotions & Codes", icon: Tag },
            { id: "reviews", label: "Patron Reviews", icon: Star },
            { id: "settings", label: "Store Settings", icon: Sliders },
            { id: "audit", label: "Security & Audit", icon: ShieldAlert },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as AdminTab)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded text-xs uppercase tracking-wider font-medium text-left transition-colors whitespace-nowrap ${
                activeTab === id
                  ? "bg-[#C59B63] text-[#1B1816] font-semibold"
                  : "text-[#B6AFA5] hover:bg-[#25211E] hover:text-[#EFECE6]"
              }`}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </aside>

        {/* Tab Content Canvas */}
        <main className="flex-1 p-6 md:p-10 max-w-7xl">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && metrics && (
            <div className="space-y-8">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl text-[#EFECE6]">Business Overview</h1>
                <p className="text-xs text-[#9D968D] mt-1">Real-time metrics calculated from live PostgreSQL database.</p>
              </div>

              {/* Metric Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="border border-[#2C2825] bg-[#1E1B18] p-5 rounded">
                  <span className="text-[10px] uppercase tracking-wider text-[#9D968D]">Total Captured Revenue</span>
                  <p className="font-serif text-3xl text-[#C59B63] mt-2 font-semibold">
                    {formatRupees(metrics.totalRevenueRupees)}
                  </p>
                  <span className="text-[10px] text-green-400 flex items-center gap-1 mt-1">
                    <TrendingUp size={12} /> Live Settlement Active
                  </span>
                </div>

                <div className="border border-[#2C2825] bg-[#1E1B18] p-5 rounded">
                  <span className="text-[10px] uppercase tracking-wider text-[#9D968D]">Total Orders</span>
                  <p className="font-serif text-3xl text-[#EFECE6] mt-2 font-semibold">
                    {metrics.totalOrders}
                  </p>
                  <span className="text-[10px] text-[#9D968D] mt-1 block">
                    {metrics.deliveredOrders} Delivered
                  </span>
                </div>

                <div className="border border-[#2C2825] bg-[#1E1B18] p-5 rounded">
                  <span className="text-[10px] uppercase tracking-wider text-[#9D968D]">Pending Dispatch</span>
                  <p className="font-serif text-3xl text-amber-400 mt-2 font-semibold">
                    {metrics.pendingOrders}
                  </p>
                  <span className="text-[10px] text-amber-400/80 mt-1 block">Requires Fulfillment</span>
                </div>

                <div className="border border-[#2C2825] bg-[#1E1B18] p-5 rounded">
                  <span className="text-[10px] uppercase tracking-wider text-[#9D968D]">Low Stock Alerts</span>
                  <p className="font-serif text-3xl text-red-400 mt-2 font-semibold">
                    {metrics.lowStockProducts}
                  </p>
                  <span className="text-[10px] text-red-400/80 mt-1 block">≤ 5 units remaining</span>
                </div>
              </div>

              {/* Recent Orders Overview */}
              <div className="border border-[#2C2825] bg-[#1E1B18] p-6 rounded">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-xl text-[#EFECE6]">Recent Customer Orders</h3>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs text-[#C59B63] hover:underline"
                  >
                    View All Orders →
                  </button>
                </div>

                {metrics.recentOrders.length === 0 ? (
                  <p className="text-xs text-[#9D968D] py-4">No customer orders placed yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#2C2825] text-[#9D968D] uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="pb-3">Order Number</th>
                          <th className="pb-3">Patron</th>
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2C2825]">
                        {metrics.recentOrders.map((o: any) => (
                          <tr key={o.id} className="hover:bg-[#25211E]/50">
                            <td className="py-3 font-mono font-medium text-[#C59B63]">{o.orderNumber}</td>
                            <td className="py-3 text-[#EFECE6]">{o.customerName}</td>
                            <td className="py-3 text-[#9D968D]">{o.date}</td>
                            <td className="py-3">
                              <span className="px-2 py-0.5 rounded text-[9px] uppercase tracking-wider bg-[#2A2521] border border-[#3E3832]">
                                {o.status}
                              </span>
                            </td>
                            <td className="py-3 text-right font-mono font-medium">{formatRupees(o.totalRupees)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PRODUCTS */}
          {activeTab === "products" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl text-[#EFECE6]">Products Catalog</h1>
                  <p className="text-xs text-[#9D968D] mt-1">Manage luxury combs, detanglers, paddle brushes, prices and status.</p>
                </div>
                <button
                  onClick={() => setShowCreateProductModal(true)}
                  className="bg-[#C59B63] hover:bg-[#d6a96f] text-[#1B1816] px-4 py-2.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 self-start transition-colors"
                >
                  <Plus size={16} />
                  <span>Create Creation</span>
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Filter by product name, SKU or category..."
                  className="w-full border border-[#2C2825] bg-[#1E1B18] p-3 pl-10 text-xs text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9D968D]" />
              </div>

              {/* Products Table */}
              <div className="border border-[#2C2825] bg-[#1E1B18] rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#2C2825] bg-[#191614] text-[#9D968D] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5">Artifact</th>
                        <th className="p-3.5">SKU</th>
                        <th className="p-3.5">Category</th>
                        <th className="p-3.5">Price</th>
                        <th className="p-3.5">Stock</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2C2825]">
                      {filteredProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#25211E]/50">
                          <td className="p-3.5 flex items-center gap-3">
                            <img src={p.image} alt={p.name} className="h-10 w-8 object-cover rounded border border-[#3E3832]" />
                            <div>
                              <p className="font-serif text-sm font-semibold text-[#EFECE6]">{p.name}</p>
                              <p className="text-[10px] text-[#9D968D] line-clamp-1">{p.tagline}</p>
                            </div>
                          </td>
                          <td className="p-3.5 font-mono text-[#9D968D]">{p.sku}</td>
                          <td className="p-3.5 text-[#B6AFA5]">{p.categoryName}</td>
                          <td className="p-3.5 font-mono text-[#C59B63] font-semibold">{formatRupees(p.priceRupees)}</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                                p.stock <= 5 ? "bg-red-950 text-red-300 border border-red-800" : "text-[#EFECE6]"
                              }`}
                            >
                              {p.stock} units
                            </span>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold ${
                                p.status === "PUBLISHED"
                                  ? "bg-green-950 text-green-300 border border-green-800"
                                  : "bg-[#2A2521] text-[#9D968D]"
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <button
                              onClick={() => setEditingProduct(p)}
                              className="text-[#C59B63] hover:underline inline-flex items-center gap-1"
                            >
                              <Edit size={12} />
                              <span>Edit</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl text-[#EFECE6]">Inventory Stock Control</h1>
                <p className="text-xs text-[#9D968D] mt-1">Adjust current warehouse stock in real-time. Stock is decremented upon payment capture.</p>
              </div>

              <div className="border border-[#2C2825] bg-[#1E1B18] rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#2C2825] bg-[#191614] text-[#9D968D] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5">Product</th>
                        <th className="p-3.5">SKU</th>
                        <th className="p-3.5">Current Stock</th>
                        <th className="p-3.5">Inventory Status</th>
                        <th className="p-3.5 text-right">Instant Adjustment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2C2825]">
                      {productsData.products.map((p) => (
                        <tr key={p.id} className="hover:bg-[#25211E]/50">
                          <td className="p-3.5 font-medium text-[#EFECE6]">{p.name}</td>
                          <td className="p-3.5 font-mono text-[#9D968D]">{p.sku}</td>
                          <td className="p-3.5 font-mono font-bold text-lg text-[#C59B63]">{p.stock}</td>
                          <td className="p-3.5">
                            {p.stock === 0 ? (
                              <span className="text-red-400 font-semibold uppercase text-[10px]">Out of Stock</span>
                            ) : p.stock <= 5 ? (
                              <span className="text-amber-400 font-semibold uppercase text-[10px]">Low Stock Alert</span>
                            ) : (
                              <span className="text-green-400 font-semibold uppercase text-[10px]">Adequate Supply</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => handleStockAdjust(p.id, Math.max(0, p.stock - 5))}
                                className="px-2 py-1 bg-[#25211E] hover:bg-[#342E29] text-[#EFECE6] rounded border border-[#3E3832]"
                              >
                                -5
                              </button>
                              <button
                                onClick={() => handleStockAdjust(p.id, Math.max(0, p.stock - 1))}
                                className="px-2 py-1 bg-[#25211E] hover:bg-[#342E29] text-[#EFECE6] rounded border border-[#3E3832]"
                              >
                                -1
                              </button>
                              <button
                                onClick={() => handleStockAdjust(p.id, p.stock + 1)}
                                className="px-2 py-1 bg-[#25211E] hover:bg-[#342E29] text-[#EFECE6] rounded border border-[#3E3832]"
                              >
                                +1
                              </button>
                              <button
                                onClick={() => handleStockAdjust(p.id, p.stock + 10)}
                                className="px-2 py-1 bg-[#25211E] hover:bg-[#342E29] text-[#EFECE6] rounded border border-[#3E3832]"
                              >
                                +10
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ORDERS */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-serif text-3xl text-[#EFECE6]">Order Management & Dispatch</h1>
                  <p className="text-xs text-[#9D968D] mt-1">Review orders, update dispatch states, add BlueDart tracking numbers, and fulfill orders.</p>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#9D968D]">Status:</span>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="border border-[#2C2825] bg-[#1E1B18] p-2 text-xs text-[#EFECE6] rounded outline-none"
                  >
                    <option value="ALL">All States</option>
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="SHIPPED">Shipped</option>
                    <option value="DELIVERED">Delivered</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="border border-[#2C2825] bg-[#1E1B18] rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#2C2825] bg-[#191614] text-[#9D968D] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5">Order Ref</th>
                        <th className="p-3.5">Customer & Phone</th>
                        <th className="p-3.5">Items</th>
                        <th className="p-3.5">Order Status</th>
                        <th className="p-3.5">Payment</th>
                        <th className="p-3.5">Airway Bill</th>
                        <th className="p-3.5">Total</th>
                        <th className="p-3.5 text-right">Manage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2C2825]">
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-[#9D968D]">
                            No orders found under this status filter.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((o: any) => (
                          <tr key={o.id} className="hover:bg-[#25211E]/50">
                            <td className="p-3.5 font-mono text-[#C59B63] font-semibold">{o.orderNumber}</td>
                            <td className="p-3.5">
                              <p className="font-semibold text-[#EFECE6]">{o.customerName}</p>
                              <p className="text-[10px] text-[#9D968D]">
                                {o.email} • {o.phone}
                              </p>
                            </td>
                            <td className="p-3.5 text-[#B6AFA5]">
                              {o.items.map((i: any) => `${i.name} (${i.quantity})`).join(", ")}
                            </td>
                            <td className="p-3.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold ${
                                  o.status === "DELIVERED"
                                    ? "bg-green-950 text-green-300 border border-green-800"
                                    : o.status === "SHIPPED"
                                      ? "bg-blue-950 text-blue-300 border border-blue-800"
                                      : "bg-amber-950 text-amber-300 border border-amber-800"
                                }`}
                              >
                                {o.status}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold ${
                                      o.paymentStatus === "CAPTURED" || o.paymentStatus === "PAID"
                                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                        : o.paymentStatus === "FAILED"
                                          ? "bg-red-950 text-red-300 border border-red-800"
                                          : "bg-amber-950 text-amber-300 border border-amber-800"
                                    }`}
                                  >
                                    {o.paymentStatus || "PENDING"}
                                  </span>
                                  <span className="text-[10px] text-[#9D968D]">{o.paymentProvider || "RAZORPAY"}</span>
                                </div>
                                {o.transactionId && o.transactionId !== "—" && (
                                  <p
                                    className="font-mono text-[9px] text-[#C59B63] truncate max-w-[130px]"
                                    title={o.transactionId}
                                  >
                                    {o.transactionId}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5 font-mono text-xs text-[#9D968D]">
                              {o.trackingNumber || "—"}
                            </td>
                            <td className="p-3.5 font-mono text-[#C59B63] font-semibold">
                              {formatRupees(o.totalRupees)}
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => {
                                  setSelectedOrder(o);
                                  setUpdatingStatus(o.status);
                                  setTrackingInput(o.trackingNumber || "");
                                  setCarrierInput(o.carrier || "BlueDart Express Air");
                                }}
                                className="bg-[#2A2521] hover:bg-[#3E3832] text-[#EFECE6] px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-semibold border border-[#3E3832]"
                              >
                                Update Status
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CUSTOMERS */}
          {activeTab === "customers" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl text-[#EFECE6]">Patrons Directory</h1>
                <p className="text-xs text-[#9D968D] mt-1">Registered patron accounts, lifetime spending and order frequency.</p>
              </div>

              <div className="border border-[#2C2825] bg-[#1E1B18] rounded overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#2C2825] bg-[#191614] text-[#9D968D] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5">Patron</th>
                        <th className="p-3.5">Email</th>
                        <th className="p-3.5">Phone</th>
                        <th className="p-3.5">Orders</th>
                        <th className="p-3.5">Lifetime Spend</th>
                        <th className="p-3.5">Member Since</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2C2825]">
                      {customers.map((c) => (
                        <tr key={c.id} className="hover:bg-[#25211E]/50">
                          <td className="p-3.5 font-semibold text-[#EFECE6]">{c.name}</td>
                          <td className="p-3.5 text-[#B6AFA5]">{c.email}</td>
                          <td className="p-3.5 text-[#9D968D]">{c.phone}</td>
                          <td className="p-3.5 font-mono">{c.ordersCount}</td>
                          <td className="p-3.5 font-mono font-semibold text-[#C59B63]">{formatRupees(c.totalSpentRupees)}</td>
                          <td className="p-3.5 text-[#9D968D]">{c.joinedDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: COUPONS */}
          {activeTab === "coupons" && (
            <div className="space-y-8">
              <div>
                <h1 className="font-serif text-3xl text-[#EFECE6]">Promotions & Coupon Codes</h1>
                <p className="text-xs text-[#9D968D] mt-1">Create discount codes with minimum order values and usage limits.</p>
              </div>

              {/* Create Coupon Form */}
              <form onSubmit={handleCreateCoupon} className="border border-[#2C2825] bg-[#1E1B18] p-6 rounded space-y-4">
                <h3 className="font-serif text-lg text-[#EFECE6]">Add New Promotion</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">Coupon Code</label>
                    <input
                      required
                      type="text"
                      value={newCouponCode}
                      onChange={(e) => setNewCouponCode(e.target.value)}
                      placeholder="e.g. FESTIVE20"
                      className="w-full border border-[#2C2825] bg-[#151311] p-2.5 rounded uppercase font-mono text-[#EFECE6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">Discount Type</label>
                    <select
                      value={newCouponType}
                      onChange={(e) => setNewCouponType(e.target.value as any)}
                      className="w-full border border-[#2C2825] bg-[#151311] p-2.5 rounded text-[#EFECE6] outline-none"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount (₹)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                      {newCouponType === "PERCENTAGE" ? "Discount Percentage (%)" : "Discount Amount (₹)"}
                    </label>
                    <input
                      required
                      type="number"
                      value={newCouponValue}
                      onChange={(e) => setNewCouponValue(Number(e.target.value))}
                      className="w-full border border-[#2C2825] bg-[#151311] p-2.5 rounded text-[#EFECE6] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">Min. Order (₹)</label>
                    <input
                      required
                      type="number"
                      value={newCouponMinOrder}
                      onChange={(e) => setNewCouponMinOrder(Number(e.target.value))}
                      className="w-full border border-[#2C2825] bg-[#151311] p-2.5 rounded text-[#EFECE6] outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-[#C59B63] text-[#1B1816] px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-wider hover:bg-[#d6a96f] transition-colors"
                >
                  Create Coupon
                </button>
              </form>

              {/* Coupons Table */}
              <div className="border border-[#2C2825] bg-[#1E1B18] rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#2C2825] bg-[#191614] text-[#9D968D] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Code</th>
                      <th className="p-3.5">Discount</th>
                      <th className="p-3.5">Min Order</th>
                      <th className="p-3.5">Times Used</th>
                      <th className="p-3.5">Active</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2C2825]">
                    {coupons.map((cp) => (
                      <tr key={cp.id} className="hover:bg-[#25211E]/50">
                        <td className="p-3.5 font-mono font-bold text-[#C59B63]">{cp.code}</td>
                        <td className="p-3.5">
                          {cp.discountType === "PERCENTAGE" ? `${cp.discountValue}% Off` : `Flat ₹${Math.round(cp.discountValue / 100)} Off`}
                        </td>
                        <td className="p-3.5">{formatRupees(cp.minOrderRupees)}</td>
                        <td className="p-3.5 font-mono">{cp.timesUsed} uses</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[9px] bg-green-950 text-green-300 border border-green-800">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: AUDIT */}
          {activeTab === "audit" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl text-[#EFECE6]">Security & Audit Trail</h1>
                <p className="text-xs text-[#9D968D] mt-1">Immutable administrative action history for compliance and accountability.</p>
              </div>

              <div className="border border-[#2C2825] bg-[#1E1B18] rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#2C2825] bg-[#191614] text-[#9D968D] uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3.5">Timestamp</th>
                      <th className="p-3.5">Administrator</th>
                      <th className="p-3.5">Action</th>
                      <th className="p-3.5">Entity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2C2825]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#25211E]/50">
                        <td className="p-3.5 font-mono text-[#9D968D]">{log.date}</td>
                        <td className="p-3.5 text-[#EFECE6] font-medium">{log.adminName}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#2A2521] border border-[#3E3832] font-mono text-[#C59B63]">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 text-[#B6AFA5]">{log.entity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: PATRON REVIEWS MODERATION */}
          {activeTab === "reviews" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="font-serif text-3xl text-[#EFECE6]">Patron Reviews & Testimonials</h1>
                  <p className="text-xs text-[#9D968D] mt-1">Moderate customer reviews submitted across the Thaksha catalog.</p>
                </div>

                <div className="flex items-center gap-2">
                  {(["ALL", "PENDING", "APPROVED"] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setReviewFilter(filter)}
                      className={`px-3 py-1.5 rounded text-xs uppercase tracking-wider font-semibold transition-colors ${
                        reviewFilter === filter
                          ? "bg-[#C59B63] text-[#1B1816]"
                          : "bg-[#25211E] text-[#9D968D] hover:text-[#EFECE6]"
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              {/* Review metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border border-[#2C2825] bg-[#1E1B18] p-4 rounded">
                  <span className="text-[10px] uppercase text-[#9D968D]">Total Reviews</span>
                  <p className="font-serif text-2xl text-[#EFECE6] mt-1">{reviews.length}</p>
                </div>
                <div className="border border-[#2C2825] bg-[#1E1B18] p-4 rounded">
                  <span className="text-[10px] uppercase text-[#9D968D]">Pending Moderation</span>
                  <p className="font-serif text-2xl text-amber-400 mt-1">
                    {reviews.filter((r) => !r.isApproved).length}
                  </p>
                </div>
                <div className="border border-[#2C2825] bg-[#1E1B18] p-4 rounded">
                  <span className="text-[10px] uppercase text-[#9D968D]">Average Score</span>
                  <p className="font-serif text-2xl text-[#C59B63] mt-1">
                    {reviews.length > 0
                      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
                      : "5.0"}{" "}
                    / 5.0
                  </p>
                </div>
              </div>

              {/* Reviews List */}
              {loadingReviews ? (
                <div className="text-center py-12 text-[#9D968D] text-xs">Loading patron reviews...</div>
              ) : reviews.length === 0 ? (
                <div className="text-center py-12 border border-[#2C2825] bg-[#1E1B18] rounded text-[#9D968D] text-xs">
                  No patron reviews recorded in database yet.
                </div>
              ) : (
                <div className="border border-[#2C2825] bg-[#1E1B18] rounded overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#2C2825] bg-[#191614] text-[#9D968D] uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="p-3.5">Product & SKU</th>
                        <th className="p-3.5">Patron</th>
                        <th className="p-3.5">Rating & Review</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Moderation Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2C2825]">
                      {reviews
                        .filter((r) => {
                          if (reviewFilter === "PENDING") return !r.isApproved;
                          if (reviewFilter === "APPROVED") return r.isApproved;
                          return true;
                        })
                        .map((rev) => (
                          <tr key={rev.id} className="hover:bg-[#25211E]/40">
                            <td className="p-3.5">
                              <p className="font-serif text-sm text-[#EFECE6] font-medium">{rev.productName}</p>
                              <span className="font-mono text-[10px] text-[#9D968D]">{rev.productSku}</span>
                            </td>
                            <td className="p-3.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[#EFECE6] font-medium">{rev.patronName}</span>
                                {rev.isVerified && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-green-950 text-green-300 border border-green-800">
                                    Verified
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-[#9D968D] block">{rev.patronEmail}</span>
                              <span className="text-[10px] text-[#9D968D] block">{rev.date}</span>
                            </td>
                            <td className="p-3.5 max-w-md">
                              <div className="flex items-center gap-1 text-[#C59B63] mb-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    size={12}
                                    className={i < rev.rating ? "fill-[#C59B63] text-[#C59B63]" : "text-[#3E3832]"}
                                  />
                                ))}
                                <span className="font-mono text-[11px] ml-1 text-[#EFECE6] font-bold">
                                  {rev.rating}.0
                                </span>
                              </div>
                              <p className="font-medium text-[#EFECE6] mb-0.5">{rev.title}</p>
                              <p className="text-[#9D968D] text-[11px] leading-relaxed italic">"{rev.body}"</p>
                            </td>
                            <td className="p-3.5">
                              {rev.isApproved ? (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-green-950 text-green-300 border border-green-800 flex items-center gap-1 w-fit">
                                  <Check size={10} /> Approved
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 w-fit">
                                  <Clock size={10} /> Pending
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!rev.isApproved ? (
                                  <button
                                    onClick={() => handleModerateReview(rev.id, "APPROVE")}
                                    className="px-2.5 py-1 bg-green-900/60 hover:bg-green-800 text-green-200 border border-green-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                    title="Approve for public storefront"
                                  >
                                    <Check size={12} /> Approve
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleModerateReview(rev.id, "UNAPPROVE")}
                                    className="px-2.5 py-1 bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-700 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                                    title="Revoke approval"
                                  >
                                    <RotateCcw size={12} /> Unapprove
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (confirm("Are you sure you want to permanently delete this review?")) {
                                      handleModerateReview(rev.id, "DELETE");
                                    }
                                  }}
                                  className="p-1.5 text-[#9D968D] hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                                  title="Delete Review"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: STORE SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl text-[#EFECE6]">Store Configuration & Operational Policies</h1>
                <p className="text-xs text-[#9D968D] mt-1">
                  Manage shipping rules, concierge contact channels, and dynamic storefront notices stored in PostgreSQL.
                </p>
              </div>

              {loadingSettings ? (
                <div className="text-center py-12 text-[#9D968D] text-xs">Loading operational parameters...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {storeSettings.map((s) => (
                    <div key={s.key} className="border border-[#2C2825] bg-[#1E1B18] p-5 rounded space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <label className="font-mono text-xs uppercase tracking-wider text-[#C59B63] font-bold block">
                            {s.key.replace(/_/g, " ")}
                          </label>
                          <p className="text-[11px] text-[#9D968D] mt-0.5">{s.description}</p>
                        </div>
                        {s.updatedAt && (
                          <span className="text-[9px] text-[#716A62] font-mono">Updated: {s.updatedAt}</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {s.key.includes("banner") || s.key.includes("tagline") ? (
                          <textarea
                            rows={2}
                            value={editingSettings[s.key] ?? s.value}
                            onChange={(e) =>
                              setEditingSettings({ ...editingSettings, [s.key]: e.target.value })
                            }
                            className="flex-1 border border-[#3E3832] bg-[#151311] p-2.5 text-xs text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                          />
                        ) : (
                          <input
                            type="text"
                            value={editingSettings[s.key] ?? s.value}
                            onChange={(e) =>
                              setEditingSettings({ ...editingSettings, [s.key]: e.target.value })
                            }
                            className="flex-1 border border-[#3E3832] bg-[#151311] p-2.5 text-xs text-[#EFECE6] rounded outline-none focus:border-[#C59B63] font-mono"
                          />
                        )}

                        <button
                          onClick={() => handleSaveSetting(s.key, s.description)}
                          disabled={savingSettingKey === s.key}
                          className="bg-[#C59B63] hover:bg-[#b0874e] text-[#1B1816] px-4 py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                        >
                          <Save size={13} />
                          <span>{savingSettingKey === s.key ? "Saving..." : "Save"}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* CREATE PRODUCT MODAL */}
      {showCreateProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1B1816] border border-[#3E3832] rounded max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#2C2825] pb-4 mb-6">
              <h3 className="font-serif text-2xl text-[#EFECE6]">Create New Neem Creation</h3>
              <button onClick={() => setShowCreateProductModal(false)} className="text-[#9D968D] hover:text-[#EFECE6]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Product Name</label>
                  <input
                    required
                    type="text"
                    value={newProdName}
                    onChange={(e) => setNewProdName(e.target.value)}
                    placeholder="e.g. The Sculptor Wide Comb"
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[#9D968D] uppercase text-[10px] mb-1">SKU</label>
                  <input
                    required
                    type="text"
                    value={newProdSku}
                    onChange={(e) => setNewProdSku(e.target.value)}
                    placeholder="THK-SCL-005"
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Tagline</label>
                <input
                  type="text"
                  value={newProdTagline}
                  onChange={(e) => setNewProdTagline(e.target.value)}
                  placeholder="Dual profile wave tooth contour"
                  className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none"
                />
              </div>

              <div>
                <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Description</label>
                <textarea
                  required
                  rows={3}
                  value={newProdDescription}
                  onChange={(e) => setNewProdDescription(e.target.value)}
                  className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Price (₹)</label>
                  <input
                    required
                    type="number"
                    value={newProdPrice}
                    onChange={(e) => setNewProdPrice(Number(e.target.value))}
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Compare-At Price (₹)</label>
                  <input
                    type="number"
                    value={newProdCompareAt || ""}
                    onChange={(e) => setNewProdCompareAt(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Optional"
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Stock Units</label>
                  <input
                    required
                    type="number"
                    value={newProdStock}
                    onChange={(e) => setNewProdStock(Number(e.target.value))}
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Category</label>
                  <select
                    value={newProdCategory}
                    onChange={(e) => setNewProdCategory(e.target.value)}
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none"
                  >
                    {productsData.categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Image URL / Path</label>
                  <input
                    type="text"
                    value={newProdImageUrl}
                    onChange={(e) => setNewProdImageUrl(e.target.value)}
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Key Benefits (One per line)</label>
                <textarea
                  rows={2}
                  value={newProdBenefits}
                  onChange={(e) => setNewProdBenefits(e.target.value)}
                  className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#2C2825]">
                <button
                  type="button"
                  onClick={() => setShowCreateProductModal(false)}
                  className="px-4 py-2 border border-[#3E3832] rounded text-[#9D968D] hover:text-[#EFECE6]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#C59B63] text-[#1B1816] px-6 py-2 rounded font-semibold uppercase tracking-wider"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1B1816] border border-[#3E3832] rounded max-w-xl w-full p-6">
            <div className="flex justify-between items-center border-b border-[#2C2825] pb-4 mb-4">
              <h3 className="font-serif text-2xl text-[#EFECE6]">Edit {editingProduct.name}</h3>
              <button onClick={() => setEditingProduct(null)} className="text-[#9D968D] hover:text-[#EFECE6]">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Product Title</label>
                <input
                  required
                  type="text"
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full border border-[#2C2825] bg-[#151311] p-2.5 text-[#EFECE6] rounded"
                />
              </div>

              <div>
                <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Tagline</label>
                <input
                  type="text"
                  value={editingProduct.tagline || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, tagline: e.target.value })}
                  className="w-full border border-[#2C2825] bg-[#151311] p-2.5 text-[#EFECE6] rounded"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Price (₹)</label>
                  <input
                    required
                    type="number"
                    value={editingProduct.priceRupees}
                    onChange={(e) => setEditingProduct({ ...editingProduct, priceRupees: Number(e.target.value) })}
                    className="w-full border border-[#2C2825] bg-[#151311] p-2.5 text-[#EFECE6] rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Stock</label>
                  <input
                    required
                    type="number"
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: Number(e.target.value) })}
                    className="w-full border border-[#2C2825] bg-[#151311] p-2.5 text-[#EFECE6] rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Status</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value })}
                    className="w-full border border-[#2C2825] bg-[#151311] p-2.5 text-[#EFECE6] rounded"
                  >
                    <option value="PUBLISHED">Published</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#2C2825]">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 border border-[#3E3832] rounded text-[#9D968D]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#C59B63] text-[#1B1816] px-5 py-2 rounded font-semibold"
                >
                  Update Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE ORDER MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#1B1816] border border-[#3E3832] rounded max-w-lg w-full p-6">
            <div className="flex justify-between items-center border-b border-[#2C2825] pb-4 mb-4">
              <h3 className="font-serif text-2xl text-[#EFECE6]">Order {selectedOrder.orderNumber}</h3>
              <button onClick={() => setSelectedOrder(null)} className="text-[#9D968D] hover:text-[#EFECE6]">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-[#151311] rounded border border-[#2C2825] space-y-1">
                <p><strong>Customer:</strong> {selectedOrder.customerName} ({selectedOrder.email})</p>
                <p><strong>Delivery:</strong> {selectedOrder.address}</p>
                <p><strong>Total:</strong> {formatRupees(selectedOrder.totalRupees)}</p>
              </div>

              <div>
                <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Update Status</label>
                <select
                  value={updatingStatus}
                  onChange={(e) => setUpdatingStatus(e.target.value)}
                  className="w-full border border-[#2C2825] bg-[#151311] p-2.5 text-[#EFECE6] rounded font-semibold"
                >
                  <option value="PAID">PAID</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Carrier Partner</label>
                <input
                  type="text"
                  value={carrierInput}
                  onChange={(e) => setCarrierInput(e.target.value)}
                  className="w-full border border-[#2C2825] bg-[#151311] p-2.5 text-[#EFECE6] rounded"
                />
              </div>

              <div>
                <label className="block text-[#9D968D] uppercase text-[10px] mb-1">Tracking Number / Airway Bill (AWB)</label>
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="e.g. BLUEDART-84920194"
                  className="w-full border border-[#2C2825] bg-[#151311] p-2.5 text-[#EFECE6] rounded font-mono"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-[#2C2825]">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 border border-[#3E3832] rounded text-[#9D968D]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdateOrderStatus}
                  className="bg-[#C59B63] text-[#1B1816] px-5 py-2 rounded font-semibold uppercase tracking-wider"
                >
                  Apply Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
