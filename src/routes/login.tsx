import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Shell, PrimaryButton } from "@/components/Shell";
import { loginCustomerFn, registerCustomerFn, loginWithGoogleFn } from "@/lib/server-auth";
import { toast } from "sonner";
import { ShieldCheck, Mail, Lock, User, Phone, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Patron Sign In & Registration — Thaksha" },
      { name: "description", content: "Sign in to your Thaksha patron account or create a new ritual profile." },
    ],
  }),
  component: LoginPage,
});

declare global {
  interface Window {
    google?: any;
  }
}

function LoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/login" });
  const redirectTarget = search.redirect || "/account";

  const [tab, setTab] = useState<"signin" | "register">("signin");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sign In fields
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  // Register fields
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // Forgot password mock/helper
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  // Load Google Identity Services SDK
  useEffect(() => {
    const scriptId = "google-gsi-client";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }
  }, []);

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
        window.dispatchEvent(new Event("thaksha:auth"));
        navigate({ to: redirectTarget as any });
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
        navigate({ to: redirectTarget as any });
      }
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please check the details.");
      toast.error(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = async () => {
    setGoogleLoading(true);
    setError(null);

    // Initialize Google One Tap / Sign In client if client ID is set
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "1083921839281-dummy.apps.googleusercontent.com";

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: any) => {
          if (response?.credential) {
            try {
              const res = await loginWithGoogleFn({
                data: { credential: response.credential },
              });
              if (res.success) {
                toast.success(`Welcome, ${res.user.name || "Patron"}`);
                window.dispatchEvent(new Event("thaksha:auth"));
                navigate({ to: redirectTarget as any });
              }
            } catch (err: any) {
              setError(err?.message || "Google authentication failed.");
              toast.error(err?.message || "Google sign in failed");
            } finally {
              setGoogleLoading(false);
            }
          }
        },
      });
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          setGoogleLoading(false);
        }
      });
    } else {
      setGoogleLoading(false);
      toast.info("Google Identity Services initializing. Please try again in a moment.");
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotSent(true);
    toast.success("Password reset instructions sent if account exists.");
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
          {redirectTarget && redirectTarget !== "/account" && (
            <p className="mt-2 text-xs text-brand-oak font-medium">
              Please sign in to proceed to {redirectTarget.replace("/", "")}.
            </p>
          )}
        </div>

        {/* Tab switcher */}
        <div className="mt-10 flex border-b border-brand-primary/10">
          <button
            type="button"
            onClick={() => {
              setTab("signin");
              setError(null);
              setShowForgot(false);
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
              setShowForgot(false);
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

        {/* Google Authentication Button */}
        <div className="mt-8">
          <button
            type="button"
            onClick={handleGoogleClick}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 border border-brand-primary/20 bg-brand-cream/80 hover:bg-brand-sage-soft/30 py-3.5 px-4 text-xs font-semibold tracking-wider uppercase text-brand-primary transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
          </button>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-brand-primary/10"></div>
            </div>
            <span className="relative bg-brand-cream px-4 text-[10px] uppercase tracking-widest text-brand-primary/50">
              Or continue with email
            </span>
          </div>
        </div>

        {tab === "signin" ? (
          showForgot ? (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                  Email Address for Recovery
                  <input
                    required
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="patron@thaksha.com"
                    className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                  />
                </label>
              </div>

              {forgotSent && (
                <p className="text-xs text-brand-sage font-medium">
                  If an account is associated with this email, recovery instructions have been dispatched.
                </p>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="px-6 py-3 border border-brand-primary/20 text-[11px] uppercase tracking-wider text-brand-primary hover:bg-brand-sage-soft/20"
                >
                  Back to Sign In
                </button>
                <PrimaryButton type="submit" className="flex-1">
                  Send Recovery Link
                </PrimaryButton>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-6">
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgot(true)}
                    className="text-[10px] uppercase tracking-wider text-brand-oak hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <input
                  required
                  type="password"
                  value={signInPassword}
                  onChange={(e) => setSignInPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="mt-2 block w-full border border-brand-primary/15 bg-transparent p-4 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                />
              </div>

              <PrimaryButton disabled={loading} className="w-full">
                {loading ? "Verifying Session..." : "Sign In to Rituals"}
              </PrimaryButton>
            </form>
          )
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
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
