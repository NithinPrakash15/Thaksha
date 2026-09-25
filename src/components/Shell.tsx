import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, UserRound, Shield, LogOut, Bell, Check, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { getCart, hydrateCustomerCart } from "@/lib/store";
import { getViewerFn, logoutUserFn, type SafeUser } from "@/lib/server-auth";
import { getUserNotificationsFn, markNotificationReadFn, type NotificationItem } from "@/lib/notifications";

export function Shell({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  const [user, setUser] = useState<SafeUser | null>(null);

  // Notification Bell State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  useEffect(() => {
    const syncCart = () => setCount(getCart().reduce((sum, line) => sum + line.quantity, 0));
    syncCart();

    const checkAuthAndNotifications = async () => {
      try {
        const viewer = await getViewerFn();
        setUser(viewer);
        if (viewer) {
          hydrateCustomerCart();
          const notes = await getUserNotificationsFn();
          setNotifications(notes);
        } else {
          setNotifications([]);
        }
      } catch {
        setUser(null);
        setNotifications([]);
      }
    };
    checkAuthAndNotifications();

    window.addEventListener("thaksha:store", syncCart);
    window.addEventListener("thaksha:auth", checkAuthAndNotifications);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("thaksha:store", syncCart);
      window.removeEventListener("thaksha:auth", checkAuthAndNotifications);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    const seen = window.sessionStorage.getItem("thaksha.logoIntroSeen");
    if (!seen) {
      setShowIntro(true);
      const timer = window.setTimeout(() => {
        window.sessionStorage.setItem("thaksha.logoIntroSeen", "true");
        setShowIntro(false);
      }, 2500);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const enterSite = () => {
    window.sessionStorage.setItem("thaksha.logoIntroSeen", "true");
    setShowIntro(false);
  };

  const handleLogout = async () => {
    try {
      await logoutUserFn();
      setUser(null);
      setNotifications([]);
      toast.success("Signed out successfully");
      window.dispatchEvent(new Event("thaksha:auth"));
      window.location.href = "/";
    } catch {
      toast.error("Logout failed");
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: string, link: string | null) => {
    await markNotificationReadFn({ data: id });
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    if (link) {
      setShowNotificationPanel(false);
      window.location.href = link;
    }
  };

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink font-sans flex flex-col">
      <Toaster richColors position="top-right" />

      {/* Top Announcement Bar */}
      <div className="bg-brand-primary text-brand-cream px-4 py-2 text-center text-[10px] uppercase tracking-[0.25em] font-medium flex items-center justify-center gap-4">
        <span>Complimentary express shipping across India on orders above ₹4,999</span>
      </div>

      {showIntro ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-cream">
          <div className="animate-logo-intro flex flex-col items-center px-6 text-center">
            <img
              src="/thaksha-logo.png"
              alt="Thaksha"
              className="h-48 w-48 object-contain md:h-72 md:w-72"
            />
            <p className="mt-6 text-[11px] uppercase tracking-[0.35em] text-brand-primary/70">
              Crafted by nature, built to last
            </p>
            <button
              onClick={enterSite}
              className="mt-8 border-b border-brand-primary/30 pb-1 text-[11px] uppercase tracking-[0.22em] text-brand-primary hover:text-brand-oak"
            >
              Enter Sanctuary
            </button>
          </div>
        </div>
      ) : null}

      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-brand-primary/5 bg-brand-cream/90 px-5 py-4 backdrop-blur-md md:px-10">
        <Link to="/" className="flex items-center gap-3 text-brand-primary">
          <img src="/thaksha-logo.png" alt="Thaksha" className="h-10 w-10 object-contain" />
          <span className="font-serif text-2xl font-semibold uppercase tracking-wider">Thaksha</span>
        </Link>

        <div className="hidden gap-8 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-primary md:flex">
          <Link to="/shop" className="hover:text-brand-oak transition-colors">
            Shop Catalog
          </Link>
          <Link to="/search" className="hover:text-brand-oak transition-colors">
            Search
          </Link>
          <Link to={user ? "/account" : "/login"} className="hover:text-brand-oak transition-colors">
            {user ? "My Sanctuary" : "Patron Sign In"}
          </Link>
        </div>

        <div className="flex items-center gap-2 md:gap-3 relative">
          <Link
            to="/search"
            aria-label="Search"
            className="p-2 text-brand-primary hover:text-brand-oak transition-colors"
          >
            <Search size={18} />
          </Link>

          {/* In-app Notification Bell */}
          {user && (
            <div className="relative">
              <button
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                aria-label="Notifications"
                className="p-2 text-brand-primary hover:text-brand-oak transition-colors relative"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 size-2 bg-red-600 rounded-full ring-2 ring-brand-cream animate-pulse" />
                )}
              </button>

              {/* Notification Popover */}
              {showNotificationPanel && (
                <div className="absolute right-0 top-12 w-80 sm:w-96 bg-brand-cream border border-brand-primary/15 shadow-xl rounded p-4 z-50 text-xs">
                  <div className="flex items-center justify-between border-b border-brand-primary/10 pb-3 mb-3">
                    <span className="font-serif text-base text-brand-primary font-semibold">
                      Ritual Notifications
                    </span>
                    <span className="text-[10px] uppercase tracking-wider text-brand-sage">
                      {unreadCount} Unread
                    </span>
                  </div>

                  {notifications.length === 0 ? (
                    <p className="text-brand-primary/60 py-6 text-center text-xs">No notifications yet.</p>
                  ) : (
                    <div className="max-h-72 overflow-y-auto divide-y divide-brand-primary/5">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkRead(n.id, n.link)}
                          className={`p-2.5 transition-colors cursor-pointer rounded ${
                            n.isRead ? "opacity-65 hover:bg-brand-primary/5" : "bg-brand-primary/5 hover:bg-brand-primary/10 font-medium"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-brand-primary text-xs">{n.title}</span>
                            <span className="text-[9px] text-brand-primary/50">{n.timeAgo}</span>
                          </div>
                          <p className="mt-1 text-xs text-brand-primary/80 leading-relaxed">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 border-t border-brand-primary/10 pt-2 text-center">
                    <Link
                      to="/account"
                      onClick={() => setShowNotificationPanel(false)}
                      className="text-[10px] uppercase tracking-wider text-brand-oak hover:underline"
                    >
                      View All in Sanctuary Account →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <Link
            to={user ? "/account" : "/login"}
            aria-label="Account"
            className="p-2 text-brand-primary hover:text-brand-oak transition-colors flex items-center gap-1"
          >
            <UserRound size={18} />
            {user && (
              <span className="hidden lg:inline text-[10px] uppercase tracking-[0.15em] font-medium max-w-[100px] truncate">
                {user.name?.split(" ")[0] || "Patron"}
              </span>
            )}
          </Link>

          {user && (
            <button
              onClick={handleLogout}
              aria-label="Logout"
              title="Sign Out"
              className="p-2 text-brand-primary/50 hover:text-brand-primary transition-colors hidden sm:block"
            >
              <LogOut size={16} />
            </button>
          )}

          <Link
            to="/cart"
            aria-label="Cart"
            className="flex items-center gap-2 p-2 text-[11px] uppercase tracking-[0.18em] text-brand-primary hover:text-brand-oak transition-colors border border-brand-primary/10 rounded-sm px-3"
          >
            <ShoppingBag size={16} />
            <span className="font-semibold">{count}</span>
          </Link>
        </div>
      </nav>

      <div className="flex-1">{children}</div>

      <footer className="bg-brand-primary px-6 pb-12 pt-20 text-brand-cream md:px-10 mt-auto">
        <div className="mx-auto grid max-w-7xl gap-10 border-t border-brand-cream/10 pt-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-serif text-3xl uppercase tracking-wider">Thaksha</div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-cream/60">
              Artisanal grooming tools hand-carved from seasoned neem wood and cured with cold-pressed botanical oils.
            </p>
          </div>
          <div className="space-y-3 text-sm text-brand-cream/70">
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-sage">Store</p>
            <Link to="/shop" className="block hover:text-brand-oak">
              All Products
            </Link>
            <Link to="/checkout" className="block hover:text-brand-oak">
              Checkout
            </Link>
            <Link to="/account" className="block hover:text-brand-oak">
              Order History & Tracking
            </Link>
          </div>
          <div className="space-y-3 text-sm text-brand-cream/70">
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-sage">Ritual & Care</p>
            <Link to="/about" className="block hover:text-brand-oak">
              The Craft of Neem
            </Link>
            <Link to="/login" className="block hover:text-brand-oak">
              Patron Sign In
            </Link>
            <span className="block text-brand-cream/40 text-xs pt-2">© {new Date().getFullYear()} Thaksha Rituals</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`bg-brand-primary px-8 py-4 text-[11px] uppercase tracking-[0.22em] text-brand-cream transition-all hover:bg-brand-oak active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 ${props.className ?? ""}`}
    />
  );
}
