import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, KeyRound, Loader2, Mail, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/forgot")({
  head: () => ({
    meta: [
      { title: "Forgot password · NetAssist AI" },
      { name: "description", content: "Reset your NetAssist AI password with an emailed link or one-time code." },
      { property: "og:title", content: "Forgot password · NetAssist AI" },
      { property: "og:description", content: "Reset your NetAssist AI password with an emailed link or one-time code." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");

  async function sendEmail(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error("Could not send reset email", { description: error.message });
      return;
    }
    setStep("code");
    toast.success("Reset email sent", { description: "Use the link or the 6-digit code in the email." });
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
    setLoading(false);
    if (error) {
      toast.error("Invalid or expired code", { description: error.message });
      return;
    }
    toast.success("Verified — set your new password");
    navigate({ to: "/reset-password", replace: true });
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
              <h1 className="font-display text-2xl font-bold tracking-tight">Reset your password</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your account email. We'll send a secure reset link and a one-time verification code.
              </p>
              <form onSubmit={sendEmail} className="mt-6 space-y-4">
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
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset code"}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 p-4">
                <KeyRound className="h-5 w-5 text-accent" />
                <div className="text-sm">
                  <div className="font-semibold text-foreground">Check your inbox</div>
                  <div className="text-muted-foreground">
                    We emailed <span className="font-medium text-foreground">{email}</span> a reset link and a 6-digit code.
                  </div>
                </div>
              </div>
              <form onSubmit={verifyCode} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Verification code</span>
                  <input
                    autoFocus
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </label>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify code"}
                </button>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <button type="button" onClick={() => setStep("email")} className="hover:text-foreground">
                    Use a different email
                  </button>
                  <button type="button" disabled={loading} onClick={() => sendEmail()} className="hover:text-foreground disabled:opacity-60">
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
