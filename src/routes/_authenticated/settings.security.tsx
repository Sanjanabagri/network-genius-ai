import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Shield, Smartphone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Factor = { id: string; friendly_name?: string | null; status: string; created_at: string };

export const Route = createFileRoute("/_authenticated/settings/security")({
  head: () => ({
    meta: [
      { title: "Security · NetAssist AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

function SecurityPage() {
  const [factors, setFactors] = useState<Factor[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<null | { factorId: string; qr: string; secret: string }>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    const { data } = await supabase.auth.mfa.listFactors();
    const totp = (data?.all ?? []).filter((f) => f.factor_type === "totp") as unknown as Factor[];
    setFactors(totp);
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function startEnroll() {
    setBusy(true);
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toLocaleDateString()}`,
    });
    setBusy(false);
    if (error) return toast.error("Could not start enrollment", { description: error.message });
    if (!data) return;
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verifyEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrolling) return;
    setBusy(true);
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
    if (chErr || !ch) {
      setBusy(false);
      return toast.error("Challenge failed", { description: chErr?.message });
    }
    const { error } = await supabase.auth.mfa.verify({ factorId: enrolling.factorId, challengeId: ch.id, code });
    setBusy(false);
    if (error) return toast.error("Invalid code", { description: error.message });
    toast.success("Two-factor authentication enabled");
    setEnrolling(null);
    setCode("");
    refresh();
  }

  async function unenroll(factorId: string) {
    if (!confirm("Remove this authenticator?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) return toast.error("Could not remove factor", { description: error.message });
    toast.success("Two-factor authentication removed");
    refresh();
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="animate-fade-up">
        <p className="text-sm text-muted-foreground">Settings</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">Security</h1>
        <p className="mt-2 text-muted-foreground">Manage two-factor authentication for your NetAssist AI account.</p>
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold">Two-factor authentication (TOTP)</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use an authenticator app such as 1Password, Authy, or Google Authenticator to generate one-time codes at sign-in.
            </p>
          </div>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : factors.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center">
              <Smartphone className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">No authenticator apps configured.</p>
              <button
                onClick={startEnroll}
                disabled={busy}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elevated disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable 2FA"}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {factors.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                    <div>
                      <div className="text-sm font-semibold">{f.friendly_name || "Authenticator"}</div>
                      <div className="text-xs text-muted-foreground">
                        Status: {f.status} · Added {new Date(f.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => unenroll(f.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Enrollment modal */}
      {enrolling && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-elevated animate-fade-up">
            <h3 className="font-display text-lg font-semibold">Scan the QR code</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Scan with your authenticator app, then enter the 6-digit code it shows.
            </p>
            <div className="mt-4 grid place-items-center rounded-xl bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={enrolling.qr} alt="TOTP QR code" className="h-48 w-48" />
            </div>
            <div className="mt-3 rounded-lg bg-muted/60 p-3">
              <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Setup key</div>
              <div className="mt-1 break-all font-mono text-xs">{enrolling.secret}</div>
            </div>
            <form onSubmit={verifyEnroll} className="mt-4 space-y-3">
              <input
                autoFocus
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-center font-mono text-xl tracking-[0.4em] outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    if (enrolling) await supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
                    setEnrolling(null);
                    setCode("");
                  }}
                  className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || code.length !== 6}
                  className="flex-1 rounded-xl bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Verify & enable"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
