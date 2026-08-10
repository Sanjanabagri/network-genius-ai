import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, KeyRound, Loader2, Mail, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/otp")({
  head: () => ({
    meta: [
      { title: "Sign in with a code · NetAssist AI" },
      { name: "description", content: "Sign in to NetAssist AI with a one-time passcode sent to your email." },
      { property: "og:title", content: "Sign in with a code · NetAssist AI" },
      { property: "og:description", content: "Sign in to NetAssist AI with a one-time passcode sent to your email." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OtpPage,
});

function OtpPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error("Could not send code", { description: error.message });
      return;
    }
    setStep("code");
    toast.success("Code sent", { description: `Check ${email} for your 6-digit code.` });
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setLoading(false);
    if (error) {
      toast.error("Invalid or expired code", { description: error.message });
      return;
    }
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <Link to="/" className="mb-10 inline-flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
            <Network className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">
            NetAssist <span className="text-gradient">AI</span>
          </span>
        </Link>

        <div className="animate-fade-up rounded-2xl border border-border bg-card p-8 shadow-elevated">
          {step === "email" ? (
            <>
              <h1 className="font-display text-2xl font-bold tracking-tight">Sign in with a code</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                No password needed — we'll email you a one-time passcode.
              </p>
              <form onSubmit={sendCode} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Email</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full rounded-xl border border-input bg-background px-10 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                    />
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Email me a code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 p-4">
                <KeyRound className="h-5 w-5 text-accent" />
                <div className="text-sm">
                  <div className="font-semibold text-foreground">Enter your code</div>
                  <div className="text-muted-foreground">
                    Sent to <span className="font-medium text-foreground">{email}</span>. It expires in a few minutes.
                  </div>
                </div>
              </div>
              <form onSubmit={verify} className="mt-6 space-y-4">
                <input
                  autoFocus
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                />
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & sign in"}
                </button>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button type="button" onClick={() => setStep("email")} className="hover:text-foreground">
                    Use a different email
                  </button>
                  <button type="button" disabled={loading} onClick={() => sendCode()} className="hover:text-foreground disabled:opacity-60">
                    Resend code
                  </button>
                </div>
              </form>
            </>
          )}

          <Link to="/auth" className="mt-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
