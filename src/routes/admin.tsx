import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getViewerFn, logoutUserFn, loginAdminFn, type SafeUser } from "@/lib/server-auth";
import {
  getAdminMetricsFn,
  getAdminProductsFn,
  createAdminProductFn,
  updateAdminProductFn,
  deleteAdminProductFn,
  updateInventoryStockFn,
  getAdminOrdersFn,
  updateAdminOrderStatusFn,
  processAdminRefundFn,
  getAdminCustomersFn,
  getAdminCouponsFn,
  createAdminCouponFn,
  getAdminAuditLogsFn,
  getAdminReviewsFn,
  moderateAdminReviewFn,
  getAdminStoreSettingsFn,
  updateAdminStoreSettingFn,
} from "@/lib/server-admin";
import {
  checkAdminSetupStatusFn,
  initialAdminSetupFn,
  adminChangePasswordFn,
  adminChangeEmailFn,
  adminRequestPasswordResetFn,
  adminResetPasswordWithTokenFn,
  adminTerminateOtherSessionsFn,
} from "@/lib/server-admin-auth";
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
  Upload,
  Lock,
  ShieldCheck,
  KeyRound,
  XCircle,
  Mail,
  User,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Loader2,
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

type AdminTab = "overview" | "products" | "inventory" | "orders" | "customers" | "coupons" | "reviews" | "settings" | "security" | "audit";

function AdminDashboardPage() {
  const loaderData = Route.useLoaderData();
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(loaderData?.adminUser || null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [metrics, setMetrics] = useState(loaderData?.initialMetrics || null);

  // Security Gate State (When Unauthenticated)
  const [setupNeeded, setSetupNeeded] = useState(false);
  const [authGateMode, setAuthGateMode] = useState<"login" | "setup" | "forgot" | "reset">("login");

  // Inline Login Credentials (Zero default credentials)
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // First-Time Setup State
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Forgot Password Gate State
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Reset With Token Gate State
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Account & Security Tab State (When Logged In)
  const [currPassword, setCurrPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [emailConfirmPassword, setEmailConfirmPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  const [terminatingSessions, setTerminatingSessions] = useState(false);

  // Evaluate password complexity
  const evalStrength = (pwd: string) => ({
    minLength: pwd.length >= 12,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd),
  });

  // Query setup status on mount if unauthenticated
  useEffect(() => {
    if (!currentUser || currentUser.role !== "ADMIN") {
      checkAdminSetupStatusFn()
        .then((res) => {
          setSetupNeeded(res.setupNeeded);
          if (res.setupNeeded) {
            setAuthGateMode("setup");
          }
        })
        .catch(() => {});
    }
  }, [currentUser]);

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

  const handleInitialSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);
    const str = evalStrength(setupPassword);
    if (!str.minLength || !str.hasUpper || !str.hasLower || !str.hasNumber || !str.hasSpecial) {
      setSetupError("Password does not meet the minimum 12-character complexity requirement.");
      return;
    }
    if (setupPassword !== setupConfirm) {
      setSetupError("Password confirmation does not match.");
      return;
    }
    setSetupLoading(true);
    try {
      const res = await initialAdminSetupFn({
        data: {
          name: setupName,
          email: setupEmail,
          password: setupPassword,
          confirmPassword: setupConfirm,
        },
      });
      if (res.success && res.user) {
        toast.success("Master administrator account initialized successfully.");
        setCurrentUser(res.user as any);
        window.dispatchEvent(new Event("thaksha:auth"));
        const freshMetrics = await getAdminMetricsFn().catch(() => null);
        setMetrics(freshMetrics);
      }
    } catch (err: any) {
      setSetupError(err?.message || "Setup failed.");
      toast.error(err?.message || "Setup failed");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);
    try {
      const res = await adminRequestPasswordResetFn({ data: { email: forgotEmail } });
      setForgotSuccess(res.message);
      toast.success("Recovery token request processed.");
    } catch (err: any) {
      setForgotError(err?.message || "Password reset request failed.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    const str = evalStrength(resetPassword);
    if (!str.minLength || !str.hasUpper || !str.hasLower || !str.hasNumber || !str.hasSpecial) {
      setResetError("Password does not satisfy complexity requirements.");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError("Passwords do not match.");
      return;
    }
    setResetLoading(true);
    try {
      const res = await adminResetPasswordWithTokenFn({
        data: {
          token: resetToken,
          newPassword: resetPassword,
          confirmPassword: resetConfirm,
        },
      });
      toast.success(res.message);
      setAuthGateMode("login");
      setResetToken("");
      setResetPassword("");
      setResetConfirm("");
    } catch (err: any) {
      setResetError(err?.message || "Password reset failed.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);
    const str = evalStrength(newPassword);
    if (!str.minLength || !str.hasUpper || !str.hasLower || !str.hasNumber || !str.hasSpecial) {
      setPwdError("New password must be at least 12 characters and include uppercase, lowercase, numbers, and symbols.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError("New password and confirmation do not match.");
      return;
    }
    setPwdLoading(true);
    try {
      const res = await adminChangePasswordFn({
        data: {
          currentPassword: currPassword,
          newPassword,
          confirmPassword,
        },
      });
      setPwdSuccess(res.message);
      toast.success("Administrator password updated successfully.");
      setCurrPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdError(err?.message || "Failed to update password.");
      toast.error(err?.message || "Update failed");
    } finally {
      setPwdLoading(false);
    }
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);
    setEmailLoading(true);
    try {
      const res = await adminChangeEmailFn({
        data: {
          newEmail: newAdminEmail,
          passwordConfirm: emailConfirmPassword,
        },
      });
      setEmailSuccess(`Administrator email successfully updated to ${res.newEmail}.`);
      toast.success("Admin email updated.");
      if (currentUser) {
        setCurrentUser({ ...currentUser, email: res.newEmail });
      }
      setNewAdminEmail("");
      setEmailConfirmPassword("");
    } catch (err: any) {
      setEmailError(err?.message || "Failed to update admin email.");
      toast.error(err?.message || "Email update failed");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleTerminateOtherSessions = async () => {
    setTerminatingSessions(true);
    try {
      const res = await adminTerminateOtherSessionsFn();
      toast.success(`Successfully terminated ${res.count} other active session(s).`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to terminate sessions.");
    } finally {
      setTerminatingSessions(false);
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
  const [newProdImages, setNewProdImages] = useState<string[]>(["/assets/hero-comb.jpg"]);
  const [newProdUrlInput, setNewProdUrlInput] = useState("");
  const [editProdUrlInput, setEditProdUrlInput] = useState("");
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [imageFileUploading, setImageFileUploading] = useState(false);
  const [newProdBenefits, setNewProdBenefits] = useState("Handmade from seasoned neem wood\nScalp wellness stimulation");

  // Product Deletion State
  const [productToDelete, setProductToDelete] = useState<any | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

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

  // Pre-load store settings on mount for live rate visibility
  useEffect(() => {
    if (currentUser && currentUser.role === "ADMIN") {
      getAdminStoreSettingsFn()
        .then((res) => {
          setStoreSettings(res);
          const initialVals: Record<string, string> = {};
          res.forEach((s) => {
            initialVals[s.key] = s.value;
          });
          setEditingSettings((prev) => ({ ...initialVals, ...prev }));
        })
        .catch(() => {});
    }
  }, [currentUser]);

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

  const [savingShippingTax, setSavingShippingTax] = useState(false);

  // Dedicated atomic updater for Shipping charges and Estimated GST
  const handleSaveShippingAndTax = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingShippingTax(true);
    try {
      const flatRate = editingSettings["flat_shipping_rate"] ?? "99";
      const freeThreshold = editingSettings["free_shipping_threshold"] ?? "4999";
      const taxRate = editingSettings["tax_rate_percent"] ?? "18";

      await Promise.all([
        updateAdminStoreSettingFn({
          data: {
            key: "flat_shipping_rate",
            value: flatRate,
            description: "Standard delivery fee in Rupees when below threshold.",
          },
        }),
        updateAdminStoreSettingFn({
          data: {
            key: "free_shipping_threshold",
            value: freeThreshold,
            description: "Cart subtotal threshold in Rupees for complimentary shipping.",
          },
        }),
        updateAdminStoreSettingFn({
          data: {
            key: "tax_rate_percent",
            value: taxRate,
            description: "Applicable GST tax percentage for handcrafted grooming tools.",
          },
        }),
      ]);

      toast.success("Shipping charges and Estimated GST rates updated successfully! Changes are live across storefront checkout.");
      const res = await getAdminStoreSettingsFn();
      setStoreSettings(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update shipping & tax settings.");
    } finally {
      setSavingShippingTax(false);
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

      const validImages = newProdImages.filter((u) => typeof u === "string" && u.trim().length > 0);
      const finalImages = validImages.length > 0 ? validImages : [newProdImageUrl || "/assets/hero-comb.jpg"];

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
          imageUrl: finalImages[0],
          imageUrls: finalImages,
          benefits,
        },
      });

      toast.success("Product created successfully with gallery pictures.");
      setShowCreateProductModal(false);
      setNewProdImages(["/assets/hero-comb.jpg"]);
      setNewProdImageUrl("/assets/hero-comb.jpg");
      setNewProdUrlInput("");
      setImageFileName(null);
      // Reload products
      const res = await getAdminProductsFn();
      setProductsData(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create product.");
    }
  };

  // Add picture via direct web URL (Create Modal)
  const handleAddCreateImageUrl = () => {
    const trimmed = newProdUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
      toast.error("Please enter a valid URL starting with http://, https://, or /");
      return;
    }
    setNewProdImages((prev) => {
      const isOnlyDefault = prev.length === 1 && prev[0] === "/assets/hero-comb.jpg";
      const updated = isOnlyDefault ? [trimmed] : [...prev, trimmed];
      setNewProdImageUrl(updated[0]);
      return updated;
    });
    setNewProdUrlInput("");
    toast.success("Picture URL added to gallery.");
  };

  // Add picture via direct web URL (Edit Modal)
  const handleAddEditImageUrl = () => {
    const trimmed = editProdUrlInput.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://") && !trimmed.startsWith("/")) {
      toast.error("Please enter a valid URL starting with http://, https://, or /");
      return;
    }
    if (!editingProduct) return;
    const current = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
      ? editingProduct.images
      : (editingProduct.image ? [editingProduct.image] : []);
    const isOnlyDefault = current.length === 1 && current[0] === "/assets/hero-comb.jpg";
    const updated = isOnlyDefault ? [trimmed] : [...current, trimmed];
    setEditingProduct({
      ...editingProduct,
      images: updated,
      image: updated[0],
    });
    setEditProdUrlInput("");
    toast.success("Picture URL added to gallery.");
  };

  // Multi-image file upload directly from computer with canvas-based optimization
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const validImageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (validImageFiles.length === 0) {
      toast.error("Please select valid image files (PNG, JPG, WebP, etc.).");
      return;
    }

    setImageFileUploading(true);
    toast.info(`Optimizing ${validImageFiles.length} photo${validImageFiles.length > 1 ? "s" : ""}...`);

    const compressOne = (file: File): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const rawDataUrl = event.target?.result as string;
          const img = new Image();
          img.onload = () => {
            const maxDim = 1200;
            let width = img.width;
            let height = img.height;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL("image/jpeg", 0.88));
            } else {
              resolve(rawDataUrl);
            }
          };
          img.onerror = () => resolve(rawDataUrl);
          img.src = rawDataUrl;
        };
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
      });
    };

    try {
      const results = await Promise.all(validImageFiles.map(compressOne));
      const successfulImages = results.filter((url) => typeof url === "string" && url.length > 0);

      if (successfulImages.length === 0) {
        toast.error("Could not process the selected images.");
        setImageFileUploading(false);
        return;
      }

      if (isEdit) {
        setEditingProduct((prev: any) => {
          if (!prev) return prev;
          const existing = Array.isArray(prev.images) && prev.images.length > 0
            ? prev.images
            : (prev.image ? [prev.image] : []);
          const isOnlyDefault = existing.length === 1 && existing[0] === "/assets/hero-comb.jpg";
          const updated = isOnlyDefault ? successfulImages : [...existing, ...successfulImages];
          return {
            ...prev,
            images: updated,
            image: updated[0] || prev.image,
          };
        });
        toast.success(`Added ${successfulImages.length} picture${successfulImages.length > 1 ? "s" : ""} to product.`);
      } else {
        setNewProdImages((prev) => {
          const isOnlyDefault = prev.length === 1 && prev[0] === "/assets/hero-comb.jpg";
          const updated = isOnlyDefault ? successfulImages : [...prev, ...successfulImages];
          setNewProdImageUrl(updated[0] || "/assets/hero-comb.jpg");
          return updated;
        });
        setImageFileName(`${successfulImages.length} picture${successfulImages.length > 1 ? "s" : ""} loaded`);
        toast.success(`Loaded ${successfulImages.length} picture${successfulImages.length > 1 ? "s" : ""} from system.`);
      }
    } catch {
      toast.error("Failed to read image files.");
    } finally {
      setImageFileUploading(false);
      e.target.value = "";
    }
  };

  // Delete Product Handler
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeletingProductId(productToDelete.id);
    try {
      await deleteAdminProductFn({ data: { productId: productToDelete.id } });
      toast.success(`Product "${productToDelete.name}" deleted successfully.`);
      setProductToDelete(null);
      const res = await getAdminProductsFn();
      setProductsData(res);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete product.");
    } finally {
      setDeletingProductId(null);
    }
  };

  // Update Product handler
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const currentImages = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
        ? editingProduct.images
        : (editingProduct.image ? [editingProduct.image] : ["/assets/hero-comb.jpg"]);

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
          imageUrl: currentImages[0],
          imageUrls: currentImages,
        },
      });

      toast.success("Product updated with multiple pictures.");
      setEditingProduct(null);
      setEditProdUrlInput("");
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

  const [processingRefund, setProcessingRefund] = useState(false);

  // Process refund handler
  const handleProcessRefund = async (orderId: string) => {
    setProcessingRefund(true);
    try {
      const res = await processAdminRefundFn({
        data: {
          orderId,
          refundNotes: "Refund processed and reversed to customer original payment method by admin.",
        },
      });
      if (res.success) {
        toast.success(`Refund recorded for order #${res.orderNumber}! Status updated to REFUNDED.`);
        setSelectedOrder(null);
        const resOrders = await getAdminOrdersFn();
        setOrders(resOrders);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to process refund.");
    } finally {
      setProcessingRefund(false);
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
        <div className="w-full max-w-lg border border-[#2C2825] bg-[#1B1816] p-8 rounded shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <img src="/thaksha-logo.png" alt="Thaksha" className="h-8 w-8 object-contain" />
            <span className="font-serif text-2xl font-bold tracking-wider text-[#C59B63] uppercase">Thaksha</span>
            <span className="text-[10px] uppercase tracking-widest text-[#9D968D] bg-[#2A2521] px-2 py-0.5 rounded border border-[#3E3832] ml-auto">
              Security Gate
            </span>
          </div>

          {/* MODE: INITIAL SETUP */}
          {authGateMode === "setup" && (
            <div>
              <div className="flex items-center gap-2 text-[#C59B63] mb-1">
                <Sparkles size={16} />
                <span className="text-[10px] uppercase tracking-widest font-semibold">Initial Store Setup</span>
              </div>
              <h2 className="font-serif text-3xl text-[#EFECE6] mb-1">Initialize Administrator</h2>
              <p className="text-xs text-[#9D968D] mb-6">
                No active administrator account was found. Establish the primary business owner administrator credentials.
                This setup gate will be permanently locked immediately after completion.
              </p>

              {setupError && (
                <div className="mb-4 border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300 rounded">
                  {setupError}
                </div>
              )}

              <form onSubmit={handleInitialSetup} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                    Administrator Full Name
                  </label>
                  <input
                    required
                    type="text"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="Business Owner Name"
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                    Administrator Email Address
                  </label>
                  <input
                    required
                    type="email"
                    value={setupEmail}
                    onChange={(e) => setSetupEmail(e.target.value)}
                    placeholder="owner@yourdomain.com"
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                    Master Password
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="••••••••••••"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                    Confirm Master Password
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="••••••••••••"
                    value={setupConfirm}
                    onChange={(e) => setSetupConfirm(e.target.value)}
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                  />
                </div>

                {/* Password Strength Checklist */}
                {(() => {
                  const str = evalStrength(setupPassword);
                  return (
                    <div className="rounded border border-[#2C2825] bg-[#151311] p-3 text-[11px] space-y-1">
                      <p className="font-semibold text-[#C59B63] uppercase tracking-wider text-[9px]">
                        Security Complexity:
                      </p>
                      <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                        <span className={`flex items-center gap-1 ${str.minLength ? "text-emerald-400" : "text-[#716A62]"}`}>
                          {str.minLength ? <CheckCircle2 size={11} /> : <XCircle size={11} />} 12+ Chars
                        </span>
                        <span className={`flex items-center gap-1 ${str.hasUpper ? "text-emerald-400" : "text-[#716A62]"}`}>
                          {str.hasUpper ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Uppercase (A-Z)
                        </span>
                        <span className={`flex items-center gap-1 ${str.hasLower ? "text-emerald-400" : "text-[#716A62]"}`}>
                          {str.hasLower ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Lowercase (a-z)
                        </span>
                        <span className={`flex items-center gap-1 ${str.hasNumber ? "text-emerald-400" : "text-[#716A62]"}`}>
                          {str.hasNumber ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Number (0-9)
                        </span>
                        <span className={`flex items-center gap-1 col-span-2 ${str.hasSpecial ? "text-emerald-400" : "text-[#716A62]"}`}>
                          {str.hasSpecial ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Special Symbol (!@#$%...)
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={setupLoading}
                  className="w-full bg-[#C59B63] hover:bg-[#b0874e] text-[#1B1816] py-3 rounded font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 text-xs mt-2"
                >
                  {setupLoading ? "Initializing Administrator..." : "Establish Master Account"}
                </button>

                {!setupNeeded && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthGateMode("login")}
                      className="text-[#9D968D] hover:text-[#C59B63] text-xs underline"
                    >
                      Return to Sign In
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* MODE: STANDARD LOGIN */}
          {authGateMode === "login" && (
            <div>
              <h2 className="font-serif text-3xl text-[#EFECE6] mb-1">Operations Console</h2>
              <p className="text-xs text-[#9D968D] mb-6">
                Sign in with administrator credentials to manage your store.
              </p>

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
                    placeholder="owner@yourdomain.com"
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] uppercase tracking-wider text-[#9D968D]">Password</label>
                    <button
                      type="button"
                      onClick={() => setAuthGateMode("forgot")}
                      className="text-[#C59B63] hover:underline text-[10px]"
                    >
                      Forgot Password?
                    </button>
                  </div>
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

                <div className="text-center pt-2">
                  <Link to="/" className="text-xs text-[#9D968D] hover:text-[#C59B63] underline">
                    Return to customer storefront
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* MODE: FORGOT PASSWORD */}
          {authGateMode === "forgot" && (
            <div>
              <h2 className="font-serif text-3xl text-[#EFECE6] mb-1">Recover Access</h2>
              <p className="text-xs text-[#9D968D] mb-6">
                Enter your administrator email to receive a single-use password recovery token.
              </p>

              {forgotError && (
                <div className="mb-4 border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300 rounded">
                  {forgotError}
                </div>
              )}

              {forgotSuccess ? (
                <div className="space-y-4">
                  <div className="border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-300 rounded space-y-1">
                    <p className="font-semibold flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 size={14} /> Token Dispatched
                    </p>
                    <p>{forgotSuccess}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAuthGateMode("reset")}
                    className="w-full bg-[#C59B63] hover:bg-[#b0874e] text-[#1B1816] py-3 rounded font-semibold uppercase tracking-wider text-xs"
                  >
                    Enter Recovery Token
                  </button>
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthGateMode("login");
                        setForgotSuccess(null);
                      }}
                      className="text-xs text-[#9D968D] hover:text-[#C59B63] underline"
                    >
                      Back to Administrator Sign In
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleForgotRequest} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                      Admin Email
                    </label>
                    <input
                      required
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="owner@yourdomain.com"
                      className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full bg-[#C59B63] hover:bg-[#b0874e] text-[#1B1816] py-3 rounded font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 text-xs"
                  >
                    {forgotLoading ? "Dispatching..." : "Issue Recovery Token"}
                  </button>
                  <div className="flex justify-between items-center pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthGateMode("reset")}
                      className="text-[#C59B63] hover:underline"
                    >
                      Have a token?
                    </button>
                    <button
                      type="button"
                      onClick={() => setAuthGateMode("login")}
                      className="text-[#9D968D] hover:text-[#C59B63] underline"
                    >
                      Cancel & Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* MODE: RESET WITH TOKEN */}
          {authGateMode === "reset" && (
            <div>
              <h2 className="font-serif text-3xl text-[#EFECE6] mb-1">Reset Password</h2>
              <p className="text-xs text-[#9D968D] mb-6">
                Enter your single-use recovery token and set your new administrator password.
              </p>

              {resetError && (
                <div className="mb-4 border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300 rounded">
                  {resetError}
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                    Recovery Token
                  </label>
                  <input
                    required
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste 64-character token"
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63] font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                    New Master Password
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="••••••••••••"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                    Confirm New Master Password
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="••••••••••••"
                    value={resetConfirm}
                    onChange={(e) => setResetConfirm(e.target.value)}
                    className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-[#C59B63] hover:bg-[#b0874e] text-[#1B1816] py-3 rounded font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 text-xs"
                >
                  {resetLoading ? "Updating..." : "Update Password & Invalidate Sessions"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setAuthGateMode("login")}
                    className="text-xs text-[#9D968D] hover:text-[#C59B63] underline"
                  >
                    Back to Administrator Sign In
                  </button>
                </div>
              </form>
            </div>
          )}
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
            { id: "security", label: "Account & Credentials", icon: ShieldCheck },
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
                  onClick={() => {
                    setNewProdImageUrl("/assets/hero-comb.jpg");
                    setImageFileName(null);
                    setShowCreateProductModal(true);
                  }}
                  className="bg-[#C59B63] hover:bg-[#d6a96f] text-[#1B1816] px-4 py-2.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 self-start transition-colors"
                >
                  <Plus size={16} />
                  <span>+ Add New Product</span>
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
                            <div className="relative">
                              <img src={p.image} alt={p.name} className="h-10 w-8 object-cover rounded border border-[#3E3832]" />
                              {Array.isArray(p.images) && p.images.length > 1 && (
                                <span
                                  className="absolute -bottom-1 -right-1 bg-[#C59B63] text-[#1B1816] text-[8px] font-bold px-1 rounded-full shadow"
                                  title={`${p.images.length} gallery pictures`}
                                >
                                  {p.images.length}
                                </span>
                              )}
                            </div>
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
                            <div className="flex items-center justify-end gap-3">
                              <button
                                onClick={() =>
                                  setEditingProduct({
                                    ...p,
                                    images: Array.isArray(p.images) && p.images.length > 0 ? p.images : [p.image || "/assets/hero-comb.jpg"],
                                  })
                                }
                                className="text-[#C59B63] hover:text-[#d6a96f] inline-flex items-center gap-1 hover:underline font-medium"
                                title="Edit Product Details"
                              >
                                <Edit size={12} />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => setProductToDelete(p)}
                                className="text-red-400 hover:text-red-300 inline-flex items-center gap-1 hover:underline font-medium"
                                title="Delete Entire Product"
                              >
                                <Trash2 size={12} />
                                <span>Delete</span>
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

                <div className="flex flex-wrap items-center gap-3">
                  {/* Dynamic Rate Info Bar */}
                  <button
                    type="button"
                    onClick={() => setActiveTab("settings")}
                    className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#1E1B18] hover:bg-[#25211E] border border-[#3E3832] text-xs text-[#EFECE6] transition-colors"
                    title="Click to modify Live Shipping Charge and Estimated GST"
                  >
                    <Truck size={13} className="text-[#C59B63]" />
                    <span className="text-[11px]">
                      Shipping: <strong className="text-[#C59B63]">₹{editingSettings["flat_shipping_rate"] ?? "99"}</strong>{" "}
                      (Free &gt; ₹{editingSettings["free_shipping_threshold"] ?? "4999"})
                    </span>
                    <span className="text-[#3E3832]">|</span>
                    <span className="text-[11px]">
                      GST: <strong className="text-[#C59B63]">{editingSettings["tax_rate_percent"] ?? "18"}%</strong>
                    </span>
                    <Edit size={11} className="text-[#9D968D] ml-1" />
                  </button>

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
                      <option value="CANCELLED">Cancelled / Refund Due</option>
                      <option value="REFUNDED">Refunded</option>
                    </select>
                  </div>
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
                              <div className="flex flex-col gap-1 items-start">
                                <span
                                  className={`px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold ${
                                    o.status === "DELIVERED"
                                      ? "bg-green-950 text-green-300 border border-green-800"
                                      : o.status === "SHIPPED"
                                        ? "bg-blue-950 text-blue-300 border border-blue-800"
                                        : o.status === "REFUNDED"
                                          ? "bg-purple-950 text-purple-300 border border-purple-800"
                                          : o.status === "CANCELLED"
                                            ? "bg-red-950 text-red-300 border border-red-800"
                                            : "bg-amber-950 text-amber-300 border border-amber-800"
                                  }`}
                                >
                                  {o.status}
                                </span>
                                {o.status === "CANCELLED" && (o.notes?.includes("REFUND_PENDING") || o.paymentStatus === "CAPTURED" || o.paymentStatus === "PAID") && (
                                  <span className="inline-flex items-center gap-1 bg-red-900/70 text-red-200 border border-red-700 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wide animate-pulse">
                                    <AlertCircle size={9} /> REFUND DUE
                                  </span>
                                )}
                                {o.cancelledReason && (
                                  <span className="text-[9px] text-[#9D968D] line-clamp-1 italic max-w-[150px]" title={o.cancelledReason}>
                                    "{o.cancelledReason}"
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-3.5">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold ${
                                      o.paymentStatus === "CAPTURED" || o.paymentStatus === "PAID"
                                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                                        : o.paymentStatus === "REFUNDED"
                                          ? "bg-purple-950 text-purple-300 border border-purple-800"
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
                              <div className="flex flex-col items-end gap-1.5">
                                <button
                                  onClick={() => {
                                    setSelectedOrder(o);
                                    setUpdatingStatus(o.status);
                                    setTrackingInput(o.trackingNumber || "");
                                    setCarrierInput(o.carrier || "BlueDart Express Air");
                                  }}
                                  className="bg-[#2A2521] hover:bg-[#3E3832] text-[#EFECE6] px-3 py-1.5 rounded text-[10px] uppercase tracking-wider font-semibold border border-[#3E3832]"
                                >
                                  {o.status === "CANCELLED" ? "Review / Refund" : "Update Status"}
                                </button>
                                {o.status === "CANCELLED" && (o.notes?.includes("REFUND_PENDING") || o.paymentStatus === "CAPTURED" || o.paymentStatus === "PAID") && (
                                  <button
                                    onClick={() => handleProcessRefund(o.id)}
                                    disabled={processingRefund}
                                    className="bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-600/80 px-2.5 py-1 rounded text-[9px] uppercase tracking-wider font-bold flex items-center gap-1 transition-all disabled:opacity-50"
                                    title="Process and mark refund complete"
                                  >
                                    <RefreshCw size={10} className={processingRefund ? "animate-spin" : ""} />
                                    Process Refund
                                  </button>
                                )}
                              </div>
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

          {/* TAB 8: STORE SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-8">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl text-[#EFECE6]">Store Configuration & Operational Policies</h1>
                <p className="text-xs text-[#9D968D] mt-1">
                  Manage live shipping charges, complimentary shipping thresholds, Estimated GST tax rates, concierge contacts, and dynamic storefront notices.
                </p>
              </div>

              {/* DEDICATED PRIORITY MODULE: SHIPPING & ESTIMATED GST RATES */}
              <div className="border border-[#C59B63]/40 bg-[#1E1B18] rounded-lg p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#C59B63]/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2C2825] pb-4 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#C59B63]/10 border border-[#C59B63]/30 flex items-center justify-center text-[#C59B63]">
                      <Truck size={20} />
                    </div>
                    <div>
                      <h2 className="font-serif text-xl text-[#EFECE6] flex items-center gap-2">
                        <span>Shipping Charges & Estimated GST</span>
                        <span className="text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-[#C59B63]/20 text-[#C59B63] border border-[#C59B63]/30">
                          Live Checkout Rates
                        </span>
                      </h2>
                      <p className="text-xs text-[#9D968D]">
                        These values are calculated live on every customer bag, checkout step, and payment order.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveShippingAndTax}
                    disabled={savingShippingTax}
                    className="bg-[#C59B63] hover:bg-[#b0874e] text-[#1B1816] px-5 py-2.5 rounded text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shrink-0"
                  >
                    {savingShippingTax ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{savingShippingTax ? "Updating Store..." : "Save Shipping & GST Rates"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* FIELD 1: FLAT SHIPPING CHARGE */}
                  <div className="space-y-2 bg-[#151311] p-4 rounded border border-[#2C2825]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#C59B63] flex items-center gap-1.5">
                        <Truck size={14} /> Standard Delivery Fee
                      </label>
                      <span className="text-[10px] text-[#9D968D]">Per Order</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9D968D] font-mono">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editingSettings["flat_shipping_rate"] ?? "99"}
                        onChange={(e) =>
                          setEditingSettings({ ...editingSettings, flat_shipping_rate: e.target.value })
                        }
                        className="w-full border border-[#3E3832] bg-[#1E1B18] pl-8 pr-3 py-2.5 text-sm text-[#EFECE6] rounded outline-none focus:border-[#C59B63] font-mono font-semibold"
                        placeholder="99"
                      />
                    </div>
                    <p className="text-[10px] text-[#9D968D] leading-tight">
                      Standard delivery fee applied when order subtotal is below the free shipping threshold. Enter 0 for store-wide free shipping.
                    </p>
                  </div>

                  {/* FIELD 2: FREE SHIPPING THRESHOLD */}
                  <div className="space-y-2 bg-[#151311] p-4 rounded border border-[#2C2825]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#C59B63] flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> Free Shipping Threshold
                      </label>
                      <span className="text-[10px] text-[#9D968D]">Cart Subtotal</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#9D968D] font-mono">₹</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={editingSettings["free_shipping_threshold"] ?? "4999"}
                        onChange={(e) =>
                          setEditingSettings({ ...editingSettings, free_shipping_threshold: e.target.value })
                        }
                        className="w-full border border-[#3E3832] bg-[#1E1B18] pl-8 pr-3 py-2.5 text-sm text-[#EFECE6] rounded outline-none focus:border-[#C59B63] font-mono font-semibold"
                        placeholder="4999"
                      />
                    </div>
                    <p className="text-[10px] text-[#9D968D] leading-tight">
                      Orders reaching or exceeding this amount receive complimentary shipping. Set 0 to disable free delivery.
                    </p>
                  </div>

                  {/* FIELD 3: ESTIMATED GST PERCENTAGE */}
                  <div className="space-y-2 bg-[#151311] p-4 rounded border border-[#2C2825]">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#C59B63] flex items-center gap-1.5">
                        <Tag size={14} /> Estimated GST Percentage
                      </label>
                      <span className="text-[10px] text-[#9D968D]">Applicable Tax</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={editingSettings["tax_rate_percent"] ?? "18"}
                        onChange={(e) =>
                          setEditingSettings({ ...editingSettings, tax_rate_percent: e.target.value })
                        }
                        className="w-full border border-[#3E3832] bg-[#1E1B18] pl-3 pr-8 py-2.5 text-sm text-[#EFECE6] rounded outline-none focus:border-[#C59B63] font-mono font-semibold"
                        placeholder="18"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[#9D968D] font-mono font-bold">%</span>
                    </div>

                    {/* GST Quick Presets */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-[9px] uppercase tracking-wider text-[#716A62]">Presets:</span>
                      {[0, 5, 12, 18, 28].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setEditingSettings({ ...editingSettings, tax_rate_percent: pct.toString() })}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                            (editingSettings["tax_rate_percent"] ?? "18") === pct.toString()
                              ? "bg-[#C59B63] text-[#1B1816] font-bold"
                              : "bg-[#25211E] text-[#9D968D] hover:text-[#EFECE6] border border-[#3E3832]"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* LIVE CHECKOUT IMPACT SIMULATOR */}
                <div className="mt-6 pt-5 border-t border-[#2C2825]">
                  <p className="text-[11px] font-semibold text-[#C59B63] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingUp size={13} /> Live Customer Checkout Preview:
                  </p>
                  {(() => {
                    const flat = Math.max(0, Number(editingSettings["flat_shipping_rate"] ?? "99"));
                    const thresh = Math.max(0, Number(editingSettings["free_shipping_threshold"] ?? "4999"));
                    const gstRate = Math.max(0, Number(editingSettings["tax_rate_percent"] ?? "18"));

                    // Example A: Subtotal 1499
                    const subA = 1499;
                    const shipA = thresh > 0 && subA >= thresh ? 0 : flat;
                    const taxA = Math.round((subA * gstRate) / 100);
                    const totalA = subA + shipA + taxA;

                    // Example B: Subtotal 5499
                    const subB = 5499;
                    const shipB = thresh > 0 && subB >= thresh ? 0 : flat;
                    const taxB = Math.round((subB * gstRate) / 100);
                    const totalB = subB + shipB + taxB;

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="bg-[#151311] p-3 rounded border border-[#2C2825] flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-[#9D968D] uppercase block">Cart Below Threshold (₹1,499):</span>
                            <span className="text-[#EFECE6]">
                              Subtotal: ₹1,499 + Shipping: <strong className="text-amber-400">₹{shipA}</strong> + GST ({gstRate}%): ₹{taxA}
                            </span>
                          </div>
                          <div className="text-right pl-3 border-l border-[#2C2825]">
                            <span className="text-[9px] uppercase text-[#9D968D] block">Customer Pays</span>
                            <span className="font-mono text-sm font-bold text-[#C59B63]">₹{totalA.toLocaleString("en-IN")}</span>
                          </div>
                        </div>

                        <div className="bg-[#151311] p-3 rounded border border-[#2C2825] flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-[#9D968D] uppercase block">Cart Above Threshold (₹5,499):</span>
                            <span className="text-[#EFECE6]">
                              Subtotal: ₹5,499 + Shipping: <strong className="text-emerald-400">{shipB === 0 ? "FREE (₹0)" : `₹${shipB}`}</strong> + GST ({gstRate}%): ₹{taxB}
                            </span>
                          </div>
                          <div className="text-right pl-3 border-l border-[#2C2825]">
                            <span className="text-[9px] uppercase text-[#9D968D] block">Customer Pays</span>
                            <span className="font-mono text-sm font-bold text-[#C59B63]">₹{totalB.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* OTHER STORE SETTINGS LIST */}
              <div>
                <h3 className="font-serif text-xl text-[#EFECE6] mb-1">General Storefront & Concierge Parameters</h3>
                <p className="text-xs text-[#9D968D] mb-4">
                  Top promotional announcement bar, concierge email, support phone, and branding tags.
                </p>

                {loadingSettings ? (
                  <div className="text-center py-12 text-[#9D968D] text-xs">Loading operational parameters...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {storeSettings
                      .filter((s) => !["flat_shipping_rate", "free_shipping_threshold", "tax_rate_percent"].includes(s.key))
                      .map((s) => (
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

              {/* Quick Jump to Account & Security */}
              <div className="flex items-center justify-between border border-[#3E3832] bg-[#1E1B18] p-4 rounded">
                <div>
                  <h4 className="text-xs font-semibold text-[#EFECE6] uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#C59B63]" />
                    Administrator Account & Security
                  </h4>
                  <p className="text-[11px] text-[#9D968D] mt-0.5">
                    Update master administrator email, modify secure passwords, or invalidate sessions.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("security")}
                  className="bg-[#C59B63] hover:bg-[#b0874e] text-[#1B1816] px-4 py-2 rounded text-xs font-semibold uppercase tracking-wider transition-colors shrink-0"
                >
                  Manage Credentials →
                </button>
              </div>
            </div>
          )}

          {/* TAB 10: ACCOUNT & CREDENTIALS SETTINGS */}
          {activeTab === "security" && (
            <div className="space-y-8">
              <div>
                <h1 className="font-serif text-3xl md:text-4xl text-[#EFECE6]">Administrator Account & Security</h1>
                <p className="text-xs text-[#9D968D] mt-1">
                  Manage master administrator credentials, cryptographic password hashes, and session enforcement rules.
                </p>
              </div>

              {/* Grid with 2 Columns */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* CARD 1: CHANGE MASTER PASSWORD */}
                <div className="border border-[#2C2825] bg-[#1E1B18] p-6 rounded space-y-4">
                  <div className="flex items-center gap-2 text-[#C59B63]">
                    <KeyRound size={18} />
                    <h3 className="font-serif text-xl text-[#EFECE6]">Change Master Password</h3>
                  </div>
                  <p className="text-xs text-[#9D968D]">
                    Updating your password will calculate a new salted cryptographic hash and terminate all other active administrator sessions across devices.
                  </p>

                  {pwdError && (
                    <div className="border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300 rounded">
                      {pwdError}
                    </div>
                  )}

                  {pwdSuccess && (
                    <div className="border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 rounded">
                      {pwdSuccess}
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                        Current Password
                      </label>
                      <input
                        required
                        type="password"
                        placeholder="••••••••••••"
                        value={currPassword}
                        onChange={(e) => setCurrPassword(e.target.value)}
                        className="w-full border border-[#3E3832] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                        New Master Password
                      </label>
                      <input
                        required
                        type="password"
                        placeholder="••••••••••••"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full border border-[#3E3832] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                        Confirm New Master Password
                      </label>
                      <input
                        required
                        type="password"
                        placeholder="••••••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full border border-[#3E3832] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                      />
                    </div>

                    {/* Complexity checklist */}
                    {(() => {
                      const str = evalStrength(newPassword);
                      return (
                        <div className="rounded border border-[#2C2825] bg-[#151311] p-3 text-[11px] space-y-1">
                          <p className="font-semibold text-[#C59B63] uppercase tracking-wider text-[9px]">
                            Password Policy:
                          </p>
                          <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                            <span className={`flex items-center gap-1 ${str.minLength ? "text-emerald-400" : "text-[#716A62]"}`}>
                              {str.minLength ? <CheckCircle2 size={11} /> : <XCircle size={11} />} 12+ Chars
                            </span>
                            <span className={`flex items-center gap-1 ${str.hasUpper ? "text-emerald-400" : "text-[#716A62]"}`}>
                              {str.hasUpper ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Uppercase (A-Z)
                            </span>
                            <span className={`flex items-center gap-1 ${str.hasLower ? "text-emerald-400" : "text-[#716A62]"}`}>
                              {str.hasLower ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Lowercase (a-z)
                            </span>
                            <span className={`flex items-center gap-1 ${str.hasNumber ? "text-emerald-400" : "text-[#716A62]"}`}>
                              {str.hasNumber ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Number (0-9)
                            </span>
                            <span className={`flex items-center gap-1 col-span-2 ${str.hasSpecial ? "text-emerald-400" : "text-[#716A62]"}`}>
                              {str.hasSpecial ? <CheckCircle2 size={11} /> : <XCircle size={11} />} Special Symbol
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <button
                      type="submit"
                      disabled={pwdLoading}
                      className="w-full bg-[#C59B63] hover:bg-[#b0874e] text-[#1B1816] py-3 rounded font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 text-xs"
                    >
                      {pwdLoading ? "Securing Password..." : "Update Master Password"}
                    </button>
                  </form>
                </div>

                {/* CARD 2: CHANGE OFFICIAL EMAIL */}
                <div className="space-y-6">
                  <div className="border border-[#2C2825] bg-[#1E1B18] p-6 rounded space-y-4">
                    <div className="flex items-center gap-2 text-[#C59B63]">
                      <Mail size={18} />
                      <h3 className="font-serif text-xl text-[#EFECE6]">Change Administrator Email</h3>
                    </div>
                    <p className="text-xs text-[#9D968D]">
                      Update your primary administrative login address. Requires entering your current password to authorize.
                    </p>

                    {emailError && (
                      <div className="border border-red-500/30 bg-red-950/20 p-3 text-xs text-red-300 rounded">
                        {emailError}
                      </div>
                    )}

                    {emailSuccess && (
                      <div className="border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 rounded">
                        {emailSuccess}
                      </div>
                    )}

                    <form onSubmit={handleChangeEmail} className="space-y-4 text-xs">
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                          Current Registered Email
                        </label>
                        <input
                          disabled
                          type="text"
                          value={currentUser?.email || ""}
                          className="w-full border border-[#2C2825] bg-[#151311] p-3 text-[#716A62] rounded font-mono text-xs cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                          New Administrator Email
                        </label>
                        <input
                          required
                          type="email"
                          value={newAdminEmail}
                          onChange={(e) => setNewAdminEmail(e.target.value)}
                          placeholder="newowner@yourdomain.com"
                          className="w-full border border-[#3E3832] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-wider text-[#9D968D] mb-1">
                          Current Password (Authorization)
                        </label>
                        <input
                          required
                          type="password"
                          placeholder="••••••••••••"
                          value={emailConfirmPassword}
                          onChange={(e) => setEmailConfirmPassword(e.target.value)}
                          className="w-full border border-[#3E3832] bg-[#151311] p-3 text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={emailLoading}
                        className="w-full bg-[#C59B63] hover:bg-[#b0874e] text-[#1B1816] py-3 rounded font-semibold uppercase tracking-wider transition-colors disabled:opacity-50 text-xs"
                      >
                        {emailLoading ? "Updating Email..." : "Authorize & Update Email"}
                      </button>
                    </form>
                  </div>

                  {/* CARD 3: SESSIONS & HARDENED CONTROLS */}
                  <div className="border border-[#2C2825] bg-[#1E1B18] p-6 rounded space-y-4">
                    <div className="flex items-center gap-2 text-[#C59B63]">
                      <ShieldCheck size={18} />
                      <h3 className="font-serif text-xl text-[#EFECE6]">Active Session Management</h3>
                    </div>
                    <div className="text-xs text-[#9D968D] space-y-2">
                      <p>
                        Current Session: <span className="font-mono text-emerald-400">Active</span> (Protected by HttpOnly, SameSite=Lax, and Secure SSL Cookie)
                      </p>
                      <p>
                        Role Enforcement: <span className="font-mono text-[#C59B63]">ADMIN (Authoritative PostgreSQL Guard)</span>
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleTerminateOtherSessions}
                      disabled={terminatingSessions}
                      className="w-full border border-red-500/30 bg-red-950/20 hover:bg-red-950/40 text-red-300 py-3 rounded font-semibold uppercase tracking-wider transition-colors text-xs flex items-center justify-center gap-2"
                    >
                      <LogOut size={14} />
                      {terminatingSessions ? "Terminating..." : "Terminate All Other Active Sessions"}
                    </button>
                  </div>
                </div>
              </div>
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

              {/* PRODUCT PICTURES GALLERY SECTION */}
              <div className="border border-[#2C2825] bg-[#151311] rounded p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24201D] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#EFECE6] font-semibold text-xs uppercase tracking-wider">
                        Product Pictures & Gallery
                      </span>
                      <span className="bg-[#2C2825] text-[#C59B63] px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        {newProdImages.length} {newProdImages.length === 1 ? "Photo" : "Photos"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#9D968D] mt-0.5">
                      First image is the main storefront cover. Click "Set as Cover" to reorder. Multiple pictures show in the product gallery.
                    </p>
                  </div>

                  <label className="cursor-pointer bg-[#C59B63] hover:bg-[#d6a96f] text-[#1B1816] px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors">
                    <Upload size={13} />
                    <span>{imageFileUploading ? "Processing..." : "Upload Photos"}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={imageFileUploading}
                      onChange={(e) => handleImageFileChange(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Gallery Thumbnails Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-1">
                  {newProdImages.map((imgUrl, idx) => (
                    <div
                      key={idx}
                      className={`relative group rounded border overflow-hidden bg-[#1B1816] aspect-square flex flex-col items-center justify-center ${
                        idx === 0 ? "border-[#C59B63] ring-1 ring-[#C59B63]/40" : "border-[#3E3832]"
                      }`}
                    >
                      <img src={imgUrl} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />

                      {/* Cover Badge */}
                      <div className="absolute top-1 left-1">
                        {idx === 0 ? (
                          <span className="bg-[#C59B63] text-[#1B1816] text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                            ★ Cover
                          </span>
                        ) : (
                          <span className="bg-black/70 text-[#B6AFA5] text-[9px] px-1 py-0.5 rounded font-mono">
                            #{idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Action buttons overlay on hover */}
                      <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1.5">
                        {idx !== 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...newProdImages];
                              const [selected] = updated.splice(idx, 1);
                              updated.unshift(selected);
                              setNewProdImages(updated);
                              setNewProdImageUrl(updated[0]);
                            }}
                            className="bg-[#C59B63] hover:bg-[#d6a96f] text-[#1B1816] text-[9px] font-semibold px-2 py-1 rounded w-full text-center"
                          >
                            Set as Cover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (newProdImages.length === 1) {
                              setNewProdImages(["/assets/hero-comb.jpg"]);
                              setNewProdImageUrl("/assets/hero-comb.jpg");
                              setImageFileName(null);
                            } else {
                              const updated = newProdImages.filter((_, i) => i !== idx);
                              setNewProdImages(updated);
                              setNewProdImageUrl(updated[0]);
                            }
                          }}
                          className="bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-[9px] px-2 py-1 rounded w-full flex items-center justify-center gap-1"
                        >
                          <Trash2 size={10} />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Add Tile */}
                  <label className="border border-dashed border-[#3E3832] hover:border-[#C59B63] rounded aspect-square flex flex-col items-center justify-center gap-1.5 cursor-pointer text-[#9D968D] hover:text-[#C59B63] transition-colors p-2 text-center bg-[#151311]">
                    <Plus size={18} />
                    <span className="text-[10px] font-medium leading-tight">+ Add Photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={imageFileUploading}
                      onChange={(e) => handleImageFileChange(e, false)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Direct Image URL adder */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#24201D]">
                  <input
                    type="url"
                    placeholder="Or paste an image web link (https://...)..."
                    value={newProdUrlInput}
                    onChange={(e) => setNewProdUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCreateImageUrl();
                      }
                    }}
                    className="flex-1 border border-[#2C2825] bg-[#1E1B18] px-3 py-1.5 text-xs text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                  />
                  <button
                    type="button"
                    onClick={handleAddCreateImageUrl}
                    className="px-3 py-1.5 bg-[#2C2825] hover:bg-[#3E3832] text-[#EFECE6] text-[10px] font-semibold rounded uppercase tracking-wider"
                  >
                    Add URL
                  </button>
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
          <div className="bg-[#1B1816] border border-[#3E3832] rounded max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
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

              {/* EDIT PRODUCT PICTURES GALLERY */}
              <div className="border border-[#2C2825] bg-[#151311] rounded p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24201D] pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#EFECE6] font-semibold text-xs uppercase tracking-wider">
                        Product Pictures & Gallery
                      </span>
                      <span className="bg-[#2C2825] text-[#C59B63] px-2 py-0.5 rounded text-[10px] font-mono font-bold">
                        {(editingProduct.images?.length || 1)} {(editingProduct.images?.length || 1) === 1 ? "Photo" : "Photos"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#9D968D] mt-0.5">
                      First image is the storefront cover. Click 'Set as Cover' to reorder. Multiple pictures show in the product gallery.
                    </p>
                  </div>

                  <label className="cursor-pointer bg-[#C59B63] hover:bg-[#d6a96f] text-[#1B1816] px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 transition-colors">
                    <Upload size={13} />
                    <span>{imageFileUploading ? "Processing..." : "Add Pictures"}</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={imageFileUploading}
                      onChange={(e) => handleImageFileChange(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Gallery Thumbnails Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-1">
                  {(editingProduct.images || (editingProduct.image ? [editingProduct.image] : ["/assets/hero-comb.jpg"])).map(
                    (imgUrl: string, idx: number) => (
                      <div
                        key={idx}
                        className={`relative group rounded border overflow-hidden bg-[#1B1816] aspect-square flex flex-col items-center justify-center ${
                          idx === 0 ? "border-[#C59B63] ring-1 ring-[#C59B63]/40" : "border-[#3E3832]"
                        }`}
                      >
                        <img src={imgUrl} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />

                        {/* Cover Badge */}
                        <div className="absolute top-1 left-1">
                          {idx === 0 ? (
                            <span className="bg-[#C59B63] text-[#1B1816] text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                              ★ Cover
                            </span>
                          ) : (
                            <span className="bg-black/70 text-[#B6AFA5] text-[9px] px-1 py-0.5 rounded font-mono">
                              #{idx + 1}
                            </span>
                          )}
                        </div>

                        {/* Hover Overlay Actions */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1.5">
                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const current = [...(editingProduct.images || [editingProduct.image])];
                                const [selected] = current.splice(idx, 1);
                                current.unshift(selected);
                                setEditingProduct({
                                  ...editingProduct,
                                  images: current,
                                  image: current[0],
                                });
                              }}
                              className="bg-[#C59B63] hover:bg-[#d6a96f] text-[#1B1816] text-[9px] font-semibold px-2 py-1 rounded w-full text-center"
                            >
                              Set as Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const current = (editingProduct.images || [editingProduct.image]).filter(
                                (_: any, i: number) => i !== idx,
                              );
                              const updated = current.length > 0 ? current : ["/assets/hero-comb.jpg"];
                              setEditingProduct({
                                ...editingProduct,
                                images: updated,
                                image: updated[0],
                              });
                            }}
                            className="bg-red-950/80 hover:bg-red-900 text-red-200 border border-red-800 text-[9px] px-2 py-1 rounded w-full flex items-center justify-center gap-1"
                          >
                            <Trash2 size={10} />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    ),
                  )}

                  {/* Add Tile */}
                  <label className="border border-dashed border-[#3E3832] hover:border-[#C59B63] rounded aspect-square flex flex-col items-center justify-center gap-1.5 cursor-pointer text-[#9D968D] hover:text-[#C59B63] transition-colors p-2 text-center bg-[#151311]">
                    <Plus size={18} />
                    <span className="text-[10px] font-medium leading-tight">+ Add Photos</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      disabled={imageFileUploading}
                      onChange={(e) => handleImageFileChange(e, true)}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Direct Image URL adder */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#24201D]">
                  <input
                    type="url"
                    placeholder="Or paste an image web link (https://...)..."
                    value={editProdUrlInput}
                    onChange={(e) => setEditProdUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddEditImageUrl();
                      }
                    }}
                    className="flex-1 border border-[#2C2825] bg-[#1E1B18] px-3 py-1.5 text-xs text-[#EFECE6] rounded outline-none focus:border-[#C59B63]"
                  />
                  <button
                    type="button"
                    onClick={handleAddEditImageUrl}
                    className="px-3 py-1.5 bg-[#2C2825] hover:bg-[#3E3832] text-[#EFECE6] text-[10px] font-semibold rounded uppercase tracking-wider"
                  >
                    Add URL
                  </button>
                </div>
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

      {/* CONFIRM DELETE PRODUCT MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#1B1816] border border-red-900/60 rounded max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle size={24} />
              <h3 className="font-serif text-xl text-[#EFECE6]">Delete Product?</h3>
            </div>
            <p className="text-xs text-[#B6AFA5] mb-2 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-[#EFECE6]">{productToDelete.name}</strong> (SKU: <span className="font-mono text-[#C59B63]">{productToDelete.sku}</span>)?
            </p>
            <p className="text-[11px] text-[#9D968D] mb-6">
              This action cannot be undone. All associated gallery images, customer wishlist items, and cart records will be completely removed from the store.
            </p>
            <div className="flex justify-end gap-3 border-t border-[#2C2825] pt-4">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={!!deletingProductId}
                className="px-4 py-2 border border-[#3E3832] rounded text-xs text-[#9D968D] hover:text-[#EFECE6] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProduct}
                disabled={!!deletingProductId}
                className="bg-red-700 hover:bg-red-600 text-white px-5 py-2 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {deletingProductId ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
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

              {/* Cancellation & Refund Review Box */}
              {selectedOrder.status === "CANCELLED" && (
                <div className="p-3.5 bg-red-950/40 border border-red-800/80 rounded space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 font-bold text-xs flex items-center gap-1.5">
                      <AlertCircle size={14} /> ORDER CANCELLED BY CUSTOMER
                    </span>
                    <span className="text-[10px] bg-red-900/80 text-red-200 px-2 py-0.5 rounded border border-red-700 font-mono">
                      {selectedOrder.notes?.includes("REFUND_PENDING") || selectedOrder.paymentStatus === "CAPTURED" || selectedOrder.paymentStatus === "PAID"
                        ? "REFUND REQUIRED"
                        : "NO REFUND NEEDED"}
                    </span>
                  </div>

                  {selectedOrder.cancelledReason && (
                    <div className="bg-[#151311] p-2 rounded border border-red-900/60">
                      <p className="text-[10px] text-[#9D968D] uppercase font-semibold">Customer Cancellation Reason:</p>
                      <p className="text-xs text-red-200 italic mt-0.5 font-medium">"{selectedOrder.cancelledReason}"</p>
                    </div>
                  )}

                  {selectedOrder.notes && (
                    <p className="text-[10px] text-[#9D968D]">
                      <strong>Internal Notes:</strong> {selectedOrder.notes}
                    </p>
                  )}

                  {(selectedOrder.notes?.includes("REFUND_PENDING") || selectedOrder.paymentStatus === "CAPTURED" || selectedOrder.paymentStatus === "PAID") && (
                    <div className="pt-2 border-t border-red-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-red-200 font-semibold">Refund Amount Due: {formatRupees(selectedOrder.totalRupees)}</p>
                        <p className="text-[10px] text-[#9D968D]">Reverses charge to customer's original account.</p>
                      </div>
                      <button
                        type="button"
                        disabled={processingRefund}
                        onClick={() => handleProcessRefund(selectedOrder.id)}
                        className="bg-red-700 hover:bg-red-600 text-white px-3.5 py-2 rounded text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-all disabled:opacity-50"
                      >
                        {processingRefund ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                        Process & Mark Refunded
                      </button>
                    </div>
                  )}
                </div>
              )}

              {selectedOrder.status === "REFUNDED" && (
                <div className="p-3 bg-purple-950/40 border border-purple-800 rounded text-purple-200 text-xs flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-purple-400 shrink-0" />
                  <div>
                    <p className="font-semibold">Refund Completed</p>
                    <p className="text-[10px] text-purple-300">This order has been officially refunded and restocked.</p>
                  </div>
                </div>
              )}

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
                  <option value="REFUNDED">REFUNDED</option>
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
