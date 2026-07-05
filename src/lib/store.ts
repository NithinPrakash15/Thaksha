import type { Product } from "@/data/catalog";

export type CartLine = {
  slug: string;
  quantity: number;
};

export type CustomerOrder = {
  id: string;
  createdAt: string;
  email: string;
  name: string;
  address: string;
  total: number;
  status: "confirmed" | "processing";
  lines: CartLine[];
};

export type CustomerProfile = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  createdAt: string;
};

const CART_KEY = "thaksha.cart";
const WISHLIST_KEY = "thaksha.wishlist";
const ORDERS_KEY = "thaksha.orders";
const PROFILE_KEY = "thaksha.profile";
const ADMIN_KEY = "thaksha.admin";

// Admin authentication moved to the separate admin site in /admin.
// Keeping these helpers temporarily for backward compatibility, but they are no longer used by the customer site.

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = <T>(key: string, value: T) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event("thaksha:store"));
};

export const getCart = () => readJson<CartLine[]>(CART_KEY, []);
export const setCart = (cart: CartLine[]) => writeJson(CART_KEY, cart);

export const addToCart = (product: Product, quantity = 1) => {
  if (product.status === "soon") return;
  const cart = getCart();
  const existing = cart.find((line) => line.slug === product.slug);
  if (existing) existing.quantity += quantity;
  else cart.push({ slug: product.slug, quantity });
  setCart(cart);
};

export const updateCartQuantity = (slug: string, quantity: number) => {
  const cart = getCart()
    .map((line) => (line.slug === slug ? { ...line, quantity } : line))
    .filter((line) => line.quantity > 0);
  setCart(cart);
};

export const clearCart = () => setCart([]);

export const getWishlist = () => readJson<string[]>(WISHLIST_KEY, []);
export const toggleWishlist = (slug: string) => {
  const current = getWishlist();
  const next = current.includes(slug)
    ? current.filter((item) => item !== slug)
    : [...current, slug];
  writeJson(WISHLIST_KEY, next);
};

export const getOrders = () => readJson<CustomerOrder[]>(ORDERS_KEY, []);
export const saveOrder = (order: Omit<CustomerOrder, "id" | "createdAt" | "status">) => {
  const next: CustomerOrder = {
    ...order,
    id: `THK-${Date.now().toString().slice(-8)}`,
    createdAt: new Date().toISOString(),
    status: "confirmed",
  };
  writeJson(ORDERS_KEY, [next, ...getOrders()]);
  clearCart();
  return next;
};

export const getProfile = () => readJson<CustomerProfile | null>(PROFILE_KEY, null);
export const saveProfile = (profile: Omit<CustomerProfile, "createdAt">) => {
  const next = { ...profile, createdAt: new Date().toISOString() };
  writeJson(PROFILE_KEY, next);
  return next;
};

// export const isAdminAuthenticated = () => readJson<boolean>(ADMIN_KEY, false);
// export const loginAdmin = (password: string) => {
//   const ok = password === "ThakshaAdmin@2026";
//   if (ok) writeJson(ADMIN_KEY, true);
//   return ok;
// };
//
// export const logoutAdmin = () => writeJson(ADMIN_KEY, false);
