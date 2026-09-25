import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PrimaryButton } from "@/components/Shell";
import { loginAdminFn } from "@/lib/server-auth";
import { ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-login")({
  head: () => ({
    meta: [
      { title: "Operations Security Portal — Thaksha" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@thaksha.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginAdminFn({
        data: { email, password },
      });

      if (res.success) {
        toast.success("Administrator credentials verified.");
        window.dispatchEvent(new Event("thaksha:auth"));
        navigate({ to: "/admin" });
      }
    } catch (err: any) {
      setError(err?.message || "Authentication rejected. Invalid credentials.");
      toast.error(err?.message || "Authentication rejected");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <main className="mx-auto max-w-lg px-6 py-24 md:px-10">
        <div className="border border-brand-primary/10 bg-brand-cream/60 p-8 shadow-sm md:p-10">
          <div className="flex items-center gap-2 text-brand-primary">
            <ShieldCheck size={20} className="text-brand-oak" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
              Operations Portal
            </span>
          </div>

          <h1 className="mt-4 font-serif text-4xl text-brand-primary md:text-5xl">
            Admin Console
          </h1>
          <p className="mt-3 text-xs leading-relaxed text-brand-primary/70">
            Authorized personnel only. Access to commerce orders, customer profiles, inventory controls, and financial transactions is audited.
          </p>

          {error && (
            <div className="mt-6 border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                Administrator Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@thaksha.com"
                  className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-3.5 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                />
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                Password
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-3.5 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                />
              </label>
            </div>

            <div className="rounded bg-brand-primary/5 p-3 text-[11px] text-brand-primary/70">
              <span className="font-semibold">Default Credentials:</span> admin@thaksha.com / AdminPassword@2026
            </div>

            <PrimaryButton disabled={loading} className="w-full flex items-center justify-center gap-2">
              <Lock size={14} />
              {loading ? "Authenticating..." : "Authorize Access"}
            </PrimaryButton>

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-brand-primary/60 hover:text-brand-oak underline">
                Return to customer storefront
              </Link>
            </div>
          </form>
        </div>
      </main>
    </Shell>
  );
}
