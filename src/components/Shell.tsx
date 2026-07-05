import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { getCart } from "@/lib/store";

export function Shell({ children }: { children: React.ReactNode }) {
  const [count, setCount] = useState(0);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    const sync = () => setCount(getCart().reduce((sum, line) => sum + line.quantity, 0));
    sync();
    window.addEventListener("thaksha:store", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("thaksha:store", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    const seen = window.sessionStorage.getItem("thaksha.logoIntroSeen");
    if (!seen) {
      setShowIntro(true);
      const timer = window.setTimeout(() => {
        window.sessionStorage.setItem("thaksha.logoIntroSeen", "true");
        setShowIntro(false);
      }, 2800);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const enterSite = () => {
    window.sessionStorage.setItem("thaksha.logoIntroSeen", "true");
    setShowIntro(false);
  };

  return (
    <div className="min-h-screen bg-brand-cream text-brand-ink font-sans">
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
              Enter
            </button>
          </div>
        </div>
      ) : null}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-brand-primary/5 bg-brand-cream/85 px-5 py-4 backdrop-blur-md md:px-10">
        <Link to="/" className="flex items-center gap-3 text-brand-primary">
          <img src="/thaksha-logo.png" alt="Thaksha" className="h-10 w-10 object-contain" />
          <span className="font-serif text-2xl font-semibold uppercase">Thaksha</span>
        </Link>
        <div className="hidden gap-8 text-[11px] font-medium uppercase tracking-[0.22em] text-brand-primary md:flex">
          <Link to="/shop" className="hover:text-brand-oak">
            Shop
          </Link>
          <Link to="/search" className="hover:text-brand-oak">
            Search
          </Link>
          <Link to="/account" className="hover:text-brand-oak">
            Account
          </Link>

        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/search"
            aria-label="Search"
            className="p-2 text-brand-primary hover:text-brand-oak"
          >
            <Search size={18} />
          </Link>
          <Link
            to="/account"
            aria-label="Account"
            className="p-2 text-brand-primary hover:text-brand-oak"
          >
            <UserRound size={18} />
          </Link>
          <Link
            to="/cart"
            aria-label="Cart"
            className="flex items-center gap-2 p-2 text-[11px] uppercase tracking-[0.18em] text-brand-primary hover:text-brand-oak"
          >
            <ShoppingBag size={18} />
            <span>{count}</span>
          </Link>
        </div>
      </nav>
      {children}
      <footer className="bg-brand-primary px-6 pb-12 pt-20 text-brand-cream md:px-10">
        <div className="mx-auto grid max-w-7xl gap-10 border-t border-brand-cream/10 pt-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-serif text-3xl uppercase">Thaksha</div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-brand-cream/60">
              Handcrafted neem tools built as a scalable commerce brand.
            </p>
          </div>
          <div className="space-y-3 text-sm text-brand-cream/70">
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-sage">Care</p>
            <Link to="/checkout" className="block hover:text-brand-oak">
              Checkout
            </Link>
            <Link to="/account" className="block hover:text-brand-oak">
              Orders
            </Link>
            <a href="mailto:care@thaksha.example" className="block hover:text-brand-oak">
              Contact
            </a>
          </div>
          <div className="space-y-3 text-sm text-brand-cream/70">
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand-sage">Legal</p>
            <a href="/robots.txt" className="block hover:text-brand-oak">
              Robots
            </a>
            <span className="block">© {new Date().getFullYear()} Thaksha Rituals</span>
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
      className={`bg-brand-primary px-8 py-4 text-[11px] uppercase tracking-[0.22em] text-brand-cream transition-colors hover:bg-brand-oak disabled:cursor-not-allowed disabled:opacity-40 ${props.className ?? ""}`}
    />
  );
}
