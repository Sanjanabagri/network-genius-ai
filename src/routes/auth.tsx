import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Lock, Mail, Network, Shield, Sparkles, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";

const searchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Sign in · NetAssist AI" },
      { name: "description", content: "Sign in or create your NetAssist AI account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(search.mode ?? "signin");

  // If already signed in, bounce to redirect target.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        navigate({ to: search.redirect ?? "/dashboard", replace: true });
      }
    });
  }, [navigate, search.redirect]);

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />
      <div className="relative mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-2">
        {/* Left · form */}
        <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
          <Link to="/" className="mb-10 inline-flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Network className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              NetAssist <span className="text-gradient">AI</span>
            </span>
          </Link>

          <div className="mx-auto w-full max-w-md animate-fade-up">
            <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {mode === "signin"
                ? "Sign in to your NetAssist AI workspace."
                : "Start automating your network in seconds. No credit card required."}
            </p>

            <div className="mt-8">
              <GoogleButton />
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-widest text-muted-foreground">or with email</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {mode === "signin" ? (
                <SignInForm redirect={search.redirect} />
              ) : (
                <SignUpForm />
              )}

              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? (
                  <>
                    New to NetAssist AI?{" "}
                    <button onClick={() => setMode("signup")} className="font-semibold text-foreground underline-offset-4 hover:underline">
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button onClick={() => setMode("signin")} className="font-semibold text-foreground underline-offset-4 hover:underline">
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right · brand panel */}
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-gradient-mesh opacity-60" />
          <div className="relative flex h-full flex-col justify-between p-12 text-primary-foreground">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-xs backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-accent" /> The AI copilot for network engineers
            </div>
            <div>
              <h2 className="font-display text-4xl font-bold leading-tight">
                Automate.<br />Troubleshoot.<br /><span className="text-gradient">Accelerate.</span>
              </h2>
              <p className="mt-4 max-w-md text-primary-foreground/80">
                Generate configurations, analyze CLI output, and ship Python + Ansible automation in seconds.
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "Vendor-aware config generation for Cisco, Palo Alto, Fortinet, SD-WAN",
                  "Root-cause analysis on CLI dumps and syslogs",
                  "Auto-generated MOPs, rollback plans, and runbooks",
                  "Two-factor authentication and SSO for teams",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-primary-foreground/90">
                    <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent/20 text-accent">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-primary-foreground/60">© {new Date().getFullYear()} NetAssist AI</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Google --- */
function GoogleButton() {
  const [loading, setLoading] = useState(false);
  return (
    <button
      type="button"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });
        if (result.error) {
          toast.error("Google sign-in failed", { description: result.error.message });
          setLoading(false);
          return;
        }
        if (result.redirected) return; // browser redirects
        // popup flow succeeded — root effect will route the user.
        window.location.href = "/dashboard";
      }}
      className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleLogo />}
      Continue with Google
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.8 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5c10.5 0 19-7.6 19-19 0-1.4-.1-2.7-.4-4z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.6 19 12.5 24 12.5c2.9 0 5.6 1.1 7.7 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 43.5c5.1 0 9.7-2 13.2-5.2l-6.1-5.2c-2 1.4-4.5 2.4-7.1 2.4-5.3 0-9.8-3.1-11.3-7.5l-6.5 5C9.6 39 16.2 43.5 24 43.5z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 5l6.1 5.2c-.4.4 6.7-4.9 6.7-14.2 0-1.4-.1-2.7-.4-4z"/>
    </svg>
  );
}

/* --- Sign in --- */
function SignInForm({ redirect }: { redirect?: string }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [otp, setOtp] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error("Sign in failed", { description: error.message });
      setLoading(false);
      return;
    }
    // Check if MFA is required
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === "aal2" && aal.currentLevel === "aal1") {
      const { data: factorsData } = await supabase.auth.mfa.listFactors();
      const factor = factorsData?.totp?.[0];
      if (factor) {
        const { data: challenge, error: chErr } = await supabase.auth.mfa.challenge({ factorId: factor.id });
        if (chErr) {
          toast.error("Could not start 2FA challenge", { description: chErr.message });
          setLoading(false);
          return;
        }
        setMfa({ factorId: factor.id, challengeId: challenge.id });
        setLoading(false);
        return;
      }
    }
    navigate({ to: redirect ?? "/dashboard", replace: true });
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    setLoading(true);
    const { error } = await supabase.auth.mfa.verify({ factorId: mfa.factorId, challengeId: mfa.challengeId, code: otp });
    if (error) {
      toast.error("Invalid code", { description: error.message });
      setLoading(false);
      return;
    }
    navigate({ to: redirect ?? "/dashboard", replace: true });
  }

  if (mfa) {
    return (
      <form onSubmit={verifyOtp} className="space-y-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-4">
          <Shield className="h-5 w-5 text-accent" />
          <div className="text-sm">
            <div className="font-semibold">Two-factor authentication</div>
            <div className="text-muted-foreground">Enter the 6-digit code from your authenticator app.</div>
          </div>
        </div>
        <input
          autoFocus
          inputMode="numeric"
          maxLength={6}
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          placeholder="000000"
        />
        <button
          type="submit"
          disabled={loading || otp.length !== 6}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field
        icon={Mail}
        label="Email"
        type="email"
        value={email}
        onChange={setEmail}
        placeholder="you@company.com"
        required
      />
      <div>
        <Field
          icon={Lock}
          label="Password"
          type={show ? "text" : "password"}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          required
          rightAdornment={
            <button type="button" onClick={() => setShow(!show)} className="text-muted-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />
        <div className="mt-2 flex items-center justify-between">
          <Link to="/auth/otp" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Sign in with a code
          </Link>
          <Link to="/auth/forgot" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            Forgot password?
          </Link>
        </div>

      </div>
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
      </button>
    </form>
  );
}

/* --- Sign up --- */
function SignUpForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: name },
      },
    });
    if (error) {
      toast.error("Sign up failed", { description: error.message });
      setLoading(false);
      return;
    }
    if (data.session) {
      toast.success("Welcome to NetAssist AI");
      navigate({ to: "/dashboard", replace: true });
    } else {
      toast.success("Check your email to confirm your account.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field icon={User} label="Full name" type="text" value={name} onChange={setName} placeholder="Ada Lovelace" required />
      <Field icon={Mail} label="Work email" type="email" value={email} onChange={setEmail} placeholder="you@company.com" required />
      <Field
        icon={Lock}
        label="Password"
        type={show ? "text" : "password"}
        value={password}
        onChange={setPassword}
        placeholder="At least 8 characters"
        required
        rightAdornment={
          <button type="button" onClick={() => setShow(!show)} className="text-muted-foreground">
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />
      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:-translate-y-0.5 disabled:opacity-60"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </form>
  );
}

/* --- Field --- */
function Field({
  icon: Icon, label, type, value, onChange, placeholder, required, rightAdornment,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  rightAdornment?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className="w-full rounded-xl border border-input bg-background px-10 py-2.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
        {rightAdornment && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightAdornment}</div>
        )}
      </div>
    </label>
  );
}
