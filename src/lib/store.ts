import type { Product } from "@/data/catalog";
import { syncDatabaseCartFn, getDatabaseCartFn } from "./server-orders";

export type CartLine = {
  slug: string;
  quantity: number;
};

const CART_KEY = "thaksha.cart";
const WISHLIST_KEY = "thaksha.wishlist";

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

export const setCart = (cart: CartLine[]) => {
  writeJson(CART_KEY, cart);
  // Asynchronously sync with PostgreSQL database if authenticated
  syncDatabaseCartFn({ data: cart }).catch(() => {});
};

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

/**
 * Hydrates cart from PostgreSQL when customer logs in.
 */
export async function hydrateCustomerCart(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const dbCart = await getDatabaseCartFn();
    if (dbCart && dbCart.length > 0) {
      // Merge with any offline items
      const localCart = getCart();
      const mergedMap = new Map<string, number>();

      for (const item of dbCart) {
        mergedMap.set(item.slug, item.quantity);
      }
      for (const item of localCart) {
        const cur = mergedMap.get(item.slug) || 0;
        mergedMap.set(item.slug, Math.max(cur, item.quantity));
      }

      const merged = Array.from(mergedMap.entries()).map(([slug, quantity]) => ({
        slug,
        quantity,
      }));

      writeJson(CART_KEY, merged);
      await syncDatabaseCartFn({ data: merged }).catch(() => {});
    } else {
      // If db cart was empty, upload local cart to db
      const localCart = getCart();
      if (localCart.length > 0) {
        await syncDatabaseCartFn({ data: localCart }).catch(() => {});
      }
    }
  } catch {}
}
