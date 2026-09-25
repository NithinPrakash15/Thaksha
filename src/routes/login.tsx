import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Shell, PrimaryButton } from "@/components/Shell";
import { loginCustomerFn, registerCustomerFn } from "@/lib/server-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Account Sign In & Registration — Thaksha" },
      { name: "description", content: "Sign in to your Thaksha patron account or create a new ritual profile." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginCustomerFn({
        data: { email: signInEmail, password: signInPassword },
      });

      if (res.success) {
        toast.success(`Welcome back, ${res.user.name || "Patron"}`);
        // Notify any store listeners
        window.dispatchEvent(new Event("thaksha:auth"));
        if (res.user.role === "ADMIN") {
          navigate({ to: "/admin" });
        } else {
          navigate({ to: "/account" });
        }
      }
    } catch (err: any) {
      setError(err?.message || "Sign in failed. Please verify your credentials.");
      toast.error(err?.message || "Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await registerCustomerFn({
        data: {
          name: regName,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
        },
      });

      if (res.success) {
        toast.success("Account created successfully!");
        window.dispatchEvent(new Event("thaksha:auth"));
        navigate({ to: "/account" });
      }
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please check the details.");
      toast.error(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell>
      <main className="mx-auto max-w-xl px-6 py-20 md:px-10">
        <div className="text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
            Patron Sanctuary
          </span>
          <h1 className="mt-3 font-serif text-5xl text-brand-primary md:text-6xl">
            {tab === "signin" ? "Sign In" : "Join Thaksha"}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-brand-primary/70">
            Access your orders, track shipments, save bespoke rituals, and manage your delivery addresses.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="mt-10 flex border-b border-brand-primary/10">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setError(null);
            }}
            className={`flex-1 pb-4 text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors ${
              tab === "signin"
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-brand-primary/40 hover:text-brand-primary"
            }`}
          >
            Existing Patron
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            className={`flex-1 pb-4 text-[11px] font-semibold uppercase tracking-[0.22em] transition-colors ${
              tab === "register"
                ? "border-b-2 border-brand-primary text-brand-primary"
                : "text-brand-primary/40 hover:text-brand-primary"
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mt-6 border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        {tab === "signin" ? (
          <form onSubmit={handleSignIn} className="mt-8 space-y-6">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                Email Address
                <input
                  required
                  type="email"
                  value={signInEmail}
                  onChange={(e) => setSignInEmail(e.target.value)}
                  placeholder="patron@thaksha.com"
                  className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                />
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                Password
                <input
                  required
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                />
              </label>
            </div>

            <div className="flex items-center justify-between text-xs text-brand-primary/60">
              <span className="italic">Demo: customer@example.com / Customer@2026</span>
              <Link to="/admin-login" className="hover:text-brand-oak underline">
                Admin portal
              </Link>
            </div>

            <PrimaryButton disabled={loading} className="w-full">
              {loading ? "Verifying..." : "Sign In to Rituals"}
            </PrimaryButton>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="mt-8 space-y-6">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                Full Name
                <input
                  required
                  type="text"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Aarav Sharma"
                  className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                />
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                Email Address
                <input
                  required
                  type="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="patron@example.com"
                  className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                />
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                Mobile Number (For dispatch updates)
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                />
              </label>
            </div>

            <div>
              <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                Create Password (Min. 8 characters)
                <input
                  required
                  minLength={8}
                  type="password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                />
              </label>
            </div>

            <PrimaryButton disabled={loading} className="w-full">
              {loading ? "Creating Profile..." : "Complete Registration"}
            </PrimaryButton>
          </form>
        )}
      </main>
    </Shell>
  );
}
