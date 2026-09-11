import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, CreditCard, Sparkles, Zap } from "lucide-react";
import { getMyBilling } from "@/lib/billing.functions";
import { PLANS, PLAN_ORDER, planOf } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Plans — NetAssist AI" },
      { name: "description", content: "Manage your NetAssist AI subscription, track daily AI usage, and compare Free, Pro and Team plans." },
      { property: "og:title", content: "Billing & Plans — NetAssist AI" },
      { property: "og:description", content: "Manage your NetAssist AI subscription and usage limits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BillingPage,
});

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number | null }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const near = limit !== null && pct >= 80;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {used}
          {limit === null ? " · unlimited" : ` / ${limit}`}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all ${near ? "bg-destructive" : "bg-gradient-primary"}`}
          style={{ width: limit === null ? "100%" : `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BillingPage() {
  const fetchBilling = useServerFn(getMyBilling);
  const { data, isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: () => fetchBilling(),
  });

  const current = planOf(data?.plan);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Billing &amp; plans</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your usage and choose the plan that fits your network team.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm">
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Current plan</span>
          <span className="font-semibold">{isLoading ? "…" : current.name}</span>
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        {isLoading ? (
          <>
            <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          </>
        ) : (
          <>
            <UsageBar label="AI generations today" used={data?.usage.aiToday ?? 0} limit={data?.usage.aiLimit ?? null} />
            <UsageBar label="Saved projects" used={data?.usage.projects ?? 0} limit={data?.usage.projectLimit ?? null} />
          </>
        )}
      </section>

      {data?.plan === "free" ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <p className="text-muted-foreground">
            You are on the Free plan — {PLANS.free.dailyAiLimit} AI generations per day and{" "}
            {PLANS.free.projectLimit} saved projects. Upgrade for unlimited usage.
          </p>
        </div>
      ) : null}

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = data?.plan === id;
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl border p-7 transition-all ${
                p.highlight
                  ? "border-transparent bg-gradient-primary text-primary-foreground shadow-elevated lg:-translate-y-2"
                  : "border-border bg-card"
              }`}
            >
              {p.highlight ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  Most popular
                </span>
              ) : null}
              <h2 className="font-display text-lg font-semibold">{p.name}</h2>
              <p className={`mt-1 text-sm ${p.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {p.desc}
              </p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold tracking-tight">{p.price}</span>
                <span className={`text-sm ${p.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {p.period}
                </span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={3} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={p.highlight ? "secondary" : "default"}
                disabled={isCurrent}
                onClick={() =>
                  toast.info("Checkout coming soon", {
                    description: "Payments are being set up. Contact us to switch plans in the meantime.",
                  })
                }
              >
                {isCurrent ? "Current plan" : `Choose ${p.name}`}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Need custom seats, SSO or invoicing? <Link to="/feedback" className="underline">Talk to us</Link>.
      </p>
    </div>
  );
}
