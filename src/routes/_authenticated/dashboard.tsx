import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Boxes, FileCode2, FileText, GitBranch, MessagesSquare, Rocket, Shield, Terminal, Wand2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · NetAssist AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const modules = [
  { icon: Wand2, title: "AI Config Generator", desc: "Cisco, Palo Alto, Fortinet, SD-WAN" },
  { icon: Terminal, title: "CLI Troubleshooter", desc: "Root cause from show output" },
  { icon: FileCode2, title: "Automation Scripts", desc: "Python, Ansible, Terraform" },
  { icon: GitBranch, title: "Change Management", desc: "MOP, rollback, risk" },
  { icon: FileText, title: "Documentation", desc: "Configs → docs, IP plans" },
  { icon: MessagesSquare, title: "Incident Manager", desc: "Timeline, RCA, resolution" },
  { icon: Activity, title: "SD-WAN Analyzer", desc: "TLOC & tunnel health" },
  { icon: Boxes, title: "Learning Center", desc: "CCNA/CCNP, Palo Alto, SD-WAN" },
];

function Dashboard() {
  const { user } = Route.useRouteContext();
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "engineer";

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="animate-fade-up">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Hi, {name} <span className="text-gradient">👋</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Your AI copilot is ready. Pick a module to get started.</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "AI requests today", value: "0", sub: "of 10 free" },
          { label: "Configurations", value: "0", sub: "all-time" },
          { label: "Scripts generated", value: "0", sub: "all-time" },
          { label: "Saved projects", value: "0", sub: "of 5" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{s.label}</div>
            <div className="mt-2 font-display text-3xl font-bold">{s.value}</div>
            <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl font-semibold">Modules</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.title} className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-elevated">
                <div className="inline-grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">{m.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                <span className="mt-3 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Coming soon
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-gradient-hero p-6 text-primary-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-accent" />
            <div>
              <div className="font-display text-lg font-semibold">Secure your account</div>
              <div className="text-sm text-primary-foreground/80">Enable two-factor authentication in under a minute.</div>
            </div>
          </div>
          <Link to="/settings/security" className="inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2 text-sm font-semibold text-foreground">
            <Rocket className="h-4 w-4" /> Enable 2FA
          </Link>
        </div>
      </div>
    </main>
  );
}
