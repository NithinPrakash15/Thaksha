import { PropsWithChildren } from "react";
import { Link, useLocation } from "@tanstack/react-router";

export function Shell({ children }: PropsWithChildren) {
  const location = useLocation();
  return (
    <div className="min-h-screen bg-brand-cream text-brand-primary">
      <header className="border-b border-brand-primary/10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-10">
          <Link to="/admin" className="font-serif text-2xl tracking-wide text-brand-primary">
            Thaksha
          </Link>
          <div className="text-xs uppercase tracking-[0.22em] text-brand-primary/50">
            {location.pathname}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
