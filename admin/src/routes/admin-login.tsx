import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Shell } from "@/components/Shell";
import { adminLoginSchema } from "@/lib/auth";

export const Route = createFileRoute("/admin-login")({
  component: AdminLogin,
});

function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    // Keep UI functional without relying on missing auth exports.
    const parsed = adminLoginSchema.safeParse({ password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    // TODO: Replace with real server-side admin auth.
    setError(
      "Admin auth not wired yet (server-side). Replace getAdminSession in admin/src/lib/auth.ts.",
    );
  };

  return (
    <Shell>
      <main className="mx-auto max-w-xl px-6 py-16 md:px-10">
        <p className="text-[11px] uppercase tracking-[0.28em] text-brand-sage">Operations</p>
        <h1 className="mt-4 font-serif text-6xl text-brand-primary">Admin Login</h1>

        <form className="mt-10 border border-brand-primary/10 p-6" onSubmit={submit}>
          <label className="text-[11px] uppercase tracking-[0.22em] text-brand-primary">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-base normal-case tracking-normal outline-none focus:border-brand-oak"
            />
          </label>

          <button
            type="submit"
            className="mt-6 w-full border border-brand-primary/30 bg-brand-primary text-brand-cream py-4 text-[11px] uppercase tracking-[0.22em]"
          >
            Enter Admin
          </button>

          {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

          <p className="mt-5 text-xs leading-relaxed text-brand-primary/50">
            Server-side admin auth will be wired next.
          </p>
        </form>
      </main>
    </Shell>
  );
}
