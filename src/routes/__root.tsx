import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-7xl text-brand-primary">404</h1>
        <h2 className="mt-4 font-serif text-2xl text-brand-primary">Page not found</h2>
        <p className="mt-2 text-sm text-brand-primary/60">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center bg-brand-primary px-8 py-4 text-[11px] uppercase tracking-[0.2em] text-brand-cream transition-colors hover:bg-brand-oak"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-cream px-4">
      <div className="max-w-md text-center">
        <h1 className="font-serif text-3xl text-brand-primary">Something went wrong</h1>
        <p className="mt-3 text-sm text-brand-primary/60">Please try again or return home.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center bg-brand-primary px-8 py-4 text-[11px] uppercase tracking-[0.2em] text-brand-cream transition-colors hover:bg-brand-oak"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center border border-brand-primary/20 px-8 py-4 text-[11px] uppercase tracking-[0.2em] text-brand-primary transition-colors hover:bg-brand-sage-soft"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Thaksha — Natural Care, Naturally You | Handcrafted Neem Wood Combs" },
      {
        name: "description",
        content:
          "Thaksha crafts premium oil-treated neem wood combs. A gentle ritual for your scalp — biodegradable, sustainable, and made to last.",
      },
      { name: "author", content: "Thaksha" },
      { property: "og:title", content: "Thaksha — Handcrafted Neem Wood Combs" },
      {
        property: "og:description",
        content:
          "A ritual for your scalp, a commitment to the earth. Discover the Thaksha Origin Comb.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@thaksha" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
