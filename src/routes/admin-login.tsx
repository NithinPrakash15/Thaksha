import { createFileRoute, useNavigate, Link, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Shell, PrimaryButton } from "@/components/Shell";
import { loginAdminFn } from "@/lib/server-auth";
import {
  checkAdminSetupStatusFn,
  initialAdminSetupFn,
  adminRequestPasswordResetFn,
  adminResetPasswordWithTokenFn,
} from "@/lib/server-admin-auth";
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  KeyRound,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-login")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Operations Security Portal — Thaksha" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

type AuthMode = "login" | "setup" | "forgot" | "reset";

function AdminLoginPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/admin-login" });
  const [mode, setMode] = useState<AuthMode>(search.token ? "reset" : "login");
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [setupAvailable, setSetupAvailable] = useState(false);

  // Standard Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // First-Time Setup State
  const [setupName, setSetupName] = useState("");
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupConfirm, setSetupConfirm] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);

  // Reset With Token State
  const [resetToken, setResetToken] = useState(search.token || "");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    checkAdminSetupStatusFn()
      .then((status) => {
        if (!mounted) return;
        setSetupAvailable(status.setupNeeded);
        if (status.setupNeeded && !search.token) {
          setMode("setup");
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setCheckingSetup(false);
      });

    return () => {
      mounted = false;
    };
  }, [search.token]);

  // Password strength checks for setup and reset
  const evalPasswordStrength = (pwd: string) => ({
    minLength: pwd.length >= 12,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd),
  });

  const activePassword = mode === "setup" ? setupPassword : resetPassword;
  const strength = evalPasswordStrength(activePassword);
  const isStrengthPassing =
    strength.minLength &&
    strength.hasUpper &&
    strength.hasLower &&
    strength.hasNumber &&
    strength.hasSpecial;

  // 1. Handle Standard Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await loginAdminFn({
        data: { email: loginEmail, password: loginPassword },
      });

      if (res.success) {
        toast.success("Administrator credentials verified.");
        window.dispatchEvent(new Event("thaksha:auth"));
        navigate({ to: "/admin" });
      }
    } catch (err: any) {
      setLoginError(err?.message || "Invalid credentials or unauthorized administrative access.");
      toast.error(err?.message || "Authentication rejected");
    } finally {
      setLoginLoading(false);
    }
  };

  // 2. Handle Initial Admin Setup
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    if (!isStrengthPassing) {
      setSetupError("Password does not meet the minimum security strength criteria.");
      return;
    }

    if (setupPassword !== setupConfirm) {
      setSetupError("Password confirmation does not match.");
      return;
    }

    setSetupLoading(true);

    try {
      const res = await initialAdminSetupFn({
        data: {
          name: setupName,
          email: setupEmail,
          password: setupPassword,
          confirmPassword: setupConfirm,
        },
      });

      if (res.success) {
        toast.success("Master administrator account established.");
        window.dispatchEvent(new Event("thaksha:auth"));
        navigate({ to: "/admin" });
      }
    } catch (err: any) {
      setSetupError(err?.message || "Initial admin setup failed.");
      toast.error(err?.message || "Setup failed");
    } finally {
      setSetupLoading(false);
    }
  };

  // 3. Handle Forgot Password Request
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccessMessage(null);
    setForgotLoading(true);

    try {
      const res = await adminRequestPasswordResetFn({
        data: { email: forgotEmail },
      });

      setForgotSuccessMessage(res.message);
      toast.success("Recovery token request processed.");
    } catch (err: any) {
      setForgotError(err?.message || "Unable to process password reset request.");
      toast.error(err?.message || "Reset request failed");
    } finally {
      setForgotLoading(false);
    }
  };

  // 4. Handle Reset with Token
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);

    if (!isStrengthPassing) {
      setResetError("New password does not satisfy complexity requirements.");
      return;
    }

    if (resetPassword !== resetConfirm) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetLoading(true);

    try {
      const res = await adminResetPasswordWithTokenFn({
        data: {
          token: resetToken,
          newPassword: resetPassword,
          confirmPassword: resetConfirm,
        },
      });

      toast.success(res.message);
      setMode("login");
      setLoginEmail("");
      setLoginPassword("");
    } catch (err: any) {
      setResetError(err?.message || "Failed to reset administrator password.");
      toast.error(err?.message || "Reset failed");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Shell>
      <main className="mx-auto max-w-lg px-6 py-20 md:px-10">
        <div className="border border-brand-primary/10 bg-brand-cream/80 p-8 shadow-md md:p-10 backdrop-blur-sm">
          {/* Header Badge */}
          <div className="flex items-center justify-between text-brand-primary">
            <div className="flex items-center gap-2">
              <ShieldCheck size={20} className="text-brand-oak" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand-sage">
                Operations Security Portal
              </span>
            </div>
            {setupAvailable && mode !== "setup" && (
              <button
                onClick={() => setMode("setup")}
                className="text-[10px] uppercase tracking-wider text-brand-oak underline hover:text-brand-primary"
              >
                Initial Setup
              </button>
            )}
          </div>

          {/* ======================================================== */}
          {/* VIEW: INITIAL SETUP                                      */}
          {/* ======================================================== */}
          {mode === "setup" && (
            <div>
              <div className="mt-4 flex items-center gap-2 text-brand-oak">
                <Sparkles size={18} />
                <span className="text-[11px] uppercase tracking-widest font-semibold">
                  First-Time Deployment
                </span>
              </div>
              <h1 className="mt-2 font-serif text-3xl text-brand-primary md:text-4xl">
                Create Master Administrator
              </h1>
              <p className="mt-2 text-xs leading-relaxed text-brand-primary/70">
                No active administrator account exists. Configure the business owner administrator credentials.
                This setup portal will be permanently locked immediately after creation.
              </p>

              {setupError && (
                <div className="mt-4 border border-red-500/25 bg-red-500/10 p-3.5 text-xs text-red-900 rounded">
                  {setupError}
                </div>
              )}

              <form onSubmit={handleSetup} className="mt-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                    Administrator Full Name
                    <div className="relative mt-1.5">
                      <User size={15} className="absolute left-3.5 top-3.5 text-brand-primary/40" />
                      <input
                        required
                        type="text"
                        value={setupName}
                        onChange={(e) => setSetupName(e.target.value)}
                        placeholder="Business Owner Name"
                        className="block w-full border border-brand-primary/15 bg-brand-cream/50 pl-10 pr-3.5 py-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                      />
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                    Official Admin Email
                    <div className="relative mt-1.5">
                      <Mail size={15} className="absolute left-3.5 top-3.5 text-brand-primary/40" />
                      <input
                        required
                        type="email"
                        value={setupEmail}
                        onChange={(e) => setSetupEmail(e.target.value)}
                        placeholder="owner@yourdomain.com"
                        className="block w-full border border-brand-primary/15 bg-brand-cream/50 pl-10 pr-3.5 py-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                      />
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                    Master Password
                    <div className="relative mt-1.5">
                      <Lock size={15} className="absolute left-3.5 top-3.5 text-brand-primary/40" />
                      <input
                        required
                        type="password"
                        value={setupPassword}
                        onChange={(e) => setSetupPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full border border-brand-primary/15 bg-brand-cream/50 pl-10 pr-3.5 py-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                      />
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                    Confirm Master Password
                    <div className="relative mt-1.5">
                      <Lock size={15} className="absolute left-3.5 top-3.5 text-brand-primary/40" />
                      <input
                        required
                        type="password"
                        value={setupConfirm}
                        onChange={(e) => setSetupConfirm(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full border border-brand-primary/15 bg-brand-cream/50 pl-10 pr-3.5 py-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                      />
                    </div>
                  </label>
                </div>

                {/* Real-time Password Strength Criteria */}
                <div className="rounded border border-brand-primary/10 bg-brand-primary/5 p-3.5 text-[11px] space-y-1.5">
                  <p className="font-semibold text-brand-primary uppercase tracking-wider text-[10px]">
                    Cryptographic Strength Requirements:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] pt-1">
                    <span className={`flex items-center gap-1.5 ${strength.minLength ? "text-emerald-700 font-medium" : "text-brand-primary/50"}`}>
                      {strength.minLength ? <CheckCircle2 size={13} /> : <XCircle size={13} />} Min. 12 characters
                    </span>
                    <span className={`flex items-center gap-1.5 ${strength.hasUpper ? "text-emerald-700 font-medium" : "text-brand-primary/50"}`}>
                      {strength.hasUpper ? <CheckCircle2 size={13} /> : <XCircle size={13} />} Uppercase (A-Z)
                    </span>
                    <span className={`flex items-center gap-1.5 ${strength.hasLower ? "text-emerald-700 font-medium" : "text-brand-primary/50"}`}>
                      {strength.hasLower ? <CheckCircle2 size={13} /> : <XCircle size={13} />} Lowercase (a-z)
                    </span>
                    <span className={`flex items-center gap-1.5 ${strength.hasNumber ? "text-emerald-700 font-medium" : "text-brand-primary/50"}`}>
                      {strength.hasNumber ? <CheckCircle2 size={13} /> : <XCircle size={13} />} Number (0-9)
                    </span>
                    <span className={`flex items-center gap-1.5 sm:col-span-2 ${strength.hasSpecial ? "text-emerald-700 font-medium" : "text-brand-primary/50"}`}>
                      {strength.hasSpecial ? <CheckCircle2 size={13} /> : <XCircle size={13} />} Special character (!@#$%^&*...)
                    </span>
                  </div>
                </div>

                <PrimaryButton disabled={setupLoading || !isStrengthPassing} className="w-full flex items-center justify-center gap-2 mt-4">
                  <KeyRound size={15} />
                  {setupLoading ? "Initializing Master Admin..." : "Create Administrator Account"}
                </PrimaryButton>

                {!setupAvailable && (
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-xs text-brand-primary/60 hover:text-brand-oak underline"
                    >
                      Return to administrator sign in
                    </button>
                  </div>
                )}
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: STANDARD LOGIN                                     */}
          {/* ======================================================== */}
          {mode === "login" && (
            <div>
              <h1 className="mt-4 font-serif text-4xl text-brand-primary md:text-5xl">
                Admin Console
              </h1>
              <p className="mt-3 text-xs leading-relaxed text-brand-primary/70">
                Authorized personnel only. Access to commerce orders, customer profiles, inventory controls, and financial transactions is audited.
              </p>

              {loginError && (
                <div className="mt-6 border border-red-500/20 bg-red-500/5 p-4 text-xs text-red-800 rounded">
                  {loginError}
                </div>
              )}

              <form onSubmit={handleLogin} className="mt-8 space-y-6">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                    Administrator Email
                    <div className="relative mt-2">
                      <Mail size={15} className="absolute left-3.5 top-3.5 text-brand-primary/40" />
                      <input
                        required
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="owner@yourdomain.com"
                        className="block w-full border border-brand-primary/15 bg-transparent pl-10 pr-3.5 py-3.5 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                      />
                    </div>
                  </label>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-[11px] text-brand-oak hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative mt-2">
                    <Lock size={15} className="absolute left-3.5 top-3.5 text-brand-primary/40" />
                    <input
                      required
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="block w-full border border-brand-primary/15 bg-transparent pl-10 pr-3.5 py-3.5 text-sm normal-case tracking-normal outline-none transition-colors focus:border-brand-oak"
                    />
                  </div>
                </div>

                <PrimaryButton disabled={loginLoading} className="w-full flex items-center justify-center gap-2">
                  <Lock size={14} />
                  {loginLoading ? "Authenticating Session..." : "Authorize Access"}
                </PrimaryButton>

                <div className="text-center pt-2">
                  <Link to="/login" className="text-xs text-brand-primary/60 hover:text-brand-oak underline">
                    Return to customer storefront
                  </Link>
                </div>
              </form>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: FORGOT PASSWORD REQUEST                            */}
          {/* ======================================================== */}
          {mode === "forgot" && (
            <div>
              <h1 className="mt-4 font-serif text-3xl text-brand-primary md:text-4xl">
                Recover Credentials
              </h1>
              <p className="mt-3 text-xs leading-relaxed text-brand-primary/70">
                Enter your registered administrator email address to request a cryptographically secure single-use recovery token.
              </p>

              {forgotError && (
                <div className="mt-4 border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-800 rounded">
                  {forgotError}
                </div>
              )}

              {forgotSuccessMessage ? (
                <div className="mt-6 space-y-4">
                  <div className="border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-900 rounded space-y-2">
                    <p className="font-semibold flex items-center gap-1.5">
                      <CheckCircle2 size={15} className="text-emerald-700" />
                      Recovery Dispatched
                    </p>
                    <p>{forgotSuccessMessage}</p>
                  </div>
                  <PrimaryButton
                    type="button"
                    onClick={() => setMode("reset")}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    <KeyRound size={14} />
                    Enter Recovery Token
                  </PrimaryButton>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setForgotSuccessMessage(null);
                    }}
                    className="w-full text-center text-xs text-brand-primary/60 hover:text-brand-oak underline pt-2"
                  >
                    Back to Administrator Sign In
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotRequest} className="mt-8 space-y-6">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                      Registered Admin Email
                      <div className="relative mt-2">
                        <Mail size={15} className="absolute left-3.5 top-3.5 text-brand-primary/40" />
                        <input
                          required
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="owner@yourdomain.com"
                          className="block w-full border border-brand-primary/15 bg-transparent pl-10 pr-3.5 py-3.5 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                        />
                      </div>
                    </label>
                  </div>

                  <PrimaryButton disabled={forgotLoading} className="w-full flex items-center justify-center gap-2">
                    <KeyRound size={14} />
                    {forgotLoading ? "Dispatching Token..." : "Issue Single-Use Recovery Token"}
                  </PrimaryButton>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-brand-oak hover:underline"
                    >
                      Already have a token?
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("login")}
                      className="text-brand-primary/60 hover:text-brand-oak underline"
                    >
                      Cancel & Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW: RESET WITH TOKEN                                   */}
          {/* ======================================================== */}
          {mode === "reset" && (
            <div>
              <h1 className="mt-4 font-serif text-3xl text-brand-primary md:text-4xl">
                Reset Administrator Password
              </h1>
              <p className="mt-3 text-xs leading-relaxed text-brand-primary/70">
                Enter your single-use recovery token and set your new high-security administrator password.
              </p>

              {resetError && (
                <div className="mt-4 border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-800 rounded">
                  {resetError}
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="mt-6 space-y-4">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                    Recovery Token
                    <input
                      required
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste 64-character token"
                      className="mt-1.5 block w-full border border-brand-primary/15 bg-transparent p-3 text-xs font-mono outline-none focus:border-brand-oak"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                    New Master Password
                    <div className="relative mt-1.5">
                      <Lock size={15} className="absolute left-3.5 top-3.5 text-brand-primary/40" />
                      <input
                        required
                        type="password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full border border-brand-primary/15 bg-transparent pl-10 pr-3.5 py-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                      />
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-[0.2em] text-brand-primary">
                    Confirm New Master Password
                    <div className="relative mt-1.5">
                      <Lock size={15} className="absolute left-3.5 top-3.5 text-brand-primary/40" />
                      <input
                        required
                        type="password"
                        value={resetConfirm}
                        onChange={(e) => setResetConfirm(e.target.value)}
                        placeholder="••••••••••••"
                        className="block w-full border border-brand-primary/15 bg-transparent pl-10 pr-3.5 py-3 text-sm normal-case tracking-normal outline-none focus:border-brand-oak"
                      />
                    </div>
                  </label>
                </div>

                {/* Password Strength Checklist */}
                <div className="rounded border border-brand-primary/10 bg-brand-primary/5 p-3 text-[11px] space-y-1">
                  <p className="font-semibold text-brand-primary uppercase tracking-wider text-[10px]">
                    Complexity Checklist:
                  </p>
                  <div className="grid grid-cols-2 gap-1 pt-1">
                    <span className={`flex items-center gap-1 ${strength.minLength ? "text-emerald-700" : "text-brand-primary/50"}`}>
                      {strength.minLength ? <CheckCircle2 size={12} /> : <XCircle size={12} />} 12+ Chars
                    </span>
                    <span className={`flex items-center gap-1 ${strength.hasUpper ? "text-emerald-700" : "text-brand-primary/50"}`}>
                      {strength.hasUpper ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Uppercase
                    </span>
                    <span className={`flex items-center gap-1 ${strength.hasLower ? "text-emerald-700" : "text-brand-primary/50"}`}>
                      {strength.hasLower ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Lowercase
                    </span>
                    <span className={`flex items-center gap-1 ${strength.hasNumber ? "text-emerald-700" : "text-brand-primary/50"}`}>
                      {strength.hasNumber ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Digit
                    </span>
                    <span className={`flex items-center gap-1 col-span-2 ${strength.hasSpecial ? "text-emerald-700" : "text-brand-primary/50"}`}>
                      {strength.hasSpecial ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Special Symbol
                    </span>
                  </div>
                </div>

                <PrimaryButton disabled={resetLoading || !isStrengthPassing} className="w-full flex items-center justify-center gap-2 mt-4">
                  <KeyRound size={14} />
                  {resetLoading ? "Updating Password..." : "Update Password & Invalidate Sessions"}
                </PrimaryButton>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-xs text-brand-primary/60 hover:text-brand-oak underline"
                  >
                    Back to Administrator Sign In
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </Shell>
  );
}
