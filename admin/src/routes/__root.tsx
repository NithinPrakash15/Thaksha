import { createFileRoute } from "@tanstack/react-router";

import { Shell } from "@/components/Shell";

export const Route = createFileRoute("/" as any)({
  component: Root,
});

function Root() {
  return (
    <Shell>
      <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
        <h1 className="font-serif text-6xl text-brand-primary">Admin</h1>
        <p className="mt-6 max-w-2xl text-brand-primary/70">
          Admin app is initializing. Navigate to the dashboard.
        </p>
      </main>
    </Shell>
  );
}
