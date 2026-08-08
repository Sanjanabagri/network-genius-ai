import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Activity, FileCode2, FileText, GitBranch, GraduationCap, Layers, MessagesSquare, Rocket, Search, Shield, Terminal, Users, Wand2, Workflow } from "lucide-react";
import type { ToolId } from "@/lib/ai.functions";
import { listProjects } from "@/lib/saved-projects.functions";
import { listTeams } from "@/lib/teams.functions";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · NetAssist AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const modules: { id: ToolId; icon: React.ComponentType<{ className?: string }>; title: string; desc: string; badge?: string }[] = [
  { id: "multi-vendor", icon: Layers, title: "Multi-Vendor Config Generator", desc: "Cisco, Palo Alto, Fortinet, Juniper, Aruba…", badge: "New" },
  { id: "troubleshooter", icon: Search, title: "AI Network Troubleshooter", desc: "Upload logs & screenshots, get root cause", badge: "New" },
  { id: "automation-studio", icon: FileCode2, title: "Automation Studio", desc: "Python, Netmiko, NAPALM, Nornir, Ansible, Terraform", badge: "New" },
  { id: "config", icon: Wand2, title: "AI Config Generator", desc: "Cisco, Palo Alto, Fortinet, SD-WAN" },
  { id: "troubleshoot", icon: Terminal, title: "CLI Troubleshooter", desc: "Root cause from show output" },
  { id: "script", icon: FileCode2, title: "Automation Scripts", desc: "Python, Ansible, Terraform" },
  { id: "mop", icon: GitBranch, title: "MOP / Change Request", desc: "Steps, checks, rollback" },
  { id: "rollback", icon: GitBranch, title: "Rollback Plan", desc: "Backout with verification" },
  { id: "cli", icon: Activity, title: "CLI Output Analyzer", desc: "Read show/log output like a pro" },
  { id: "docs", icon: FileText, title: "Network Documentation", desc: "Configs → docs, IP plans" },
  { id: "incident", icon: MessagesSquare, title: "Incident Summary", desc: "Timeline, RCA, action items" },
  { id: "workflow", icon: Workflow, title: "Workflow Designer", desc: "End-to-end automation" },
];


function Dashboard() {
  const { user } = Route.useRouteContext();
  const name = (user.user_metadata?.full_name as string | undefined) ?? user.email?.split("@")[0] ?? "engineer";

  const projectsFn = useServerFn(listProjects);
  const teamsFn = useServerFn(listTeams);
  const projects = useQuery({ queryKey: ["saved_projects"], queryFn: () => projectsFn() });
  const teams = useQuery({ queryKey: ["teams"], queryFn: () => teamsFn() });

  const rows = projects.data ?? [];
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todayCount = rows.filter((p) => new Date(p.created_at) >= startOfToday).length;
  const configCount = rows.filter((p) => p.tool === "config" || p.tool === "multi-vendor").length;
  const scriptCount = rows.filter((p) => p.tool === "script" || p.tool === "automation-studio").length;
  const loadingStats = projects.isLoading;
  const num = (n: number) => (loadingStats ? "—" : String(n));

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="animate-fade-up">
        <p className="text-sm text-muted-foreground">Welcome back</p>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Hi, {name} <span className="text-gradient">👋</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Your AI copilot is ready. Pick a module to get started.</p>
      </div>

      <OnboardingWalkthrough />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {[
          { label: "Generations today", value: num(todayCount), sub: "saved in the last 24h", to: "/projects" as string | null },
          { label: "Configurations", value: num(configCount), sub: "all-time", to: "/projects" },
          { label: "Scripts generated", value: num(scriptCount), sub: "all-time", to: "/projects" },
          { label: "Teams", value: teams.isLoading ? "—" : String(teams.data?.length ?? 0), sub: "collaborate", to: "/teams" },
        ].map((s) => {
          const inner = (
            <>
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{s.label}</div>
              <div className="mt-2 font-display text-3xl font-bold">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
            </>
          );
          return s.to ? (
            <Link key={s.label} to={s.to} className="rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated">
              {inner}
            </Link>
          ) : (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5">{inner}</div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link to="/teams" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-base font-semibold">Teams &amp; collaboration</div>
            <div className="text-sm text-muted-foreground">Invite engineers, assign roles, share projects.</div>
          </div>
        </Link>
        <Link to="/learn" className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-base font-semibold">Learning Center</div>
            <div className="text-sm text-muted-foreground">Guided paths with prompts pre-loaded into the tools.</div>
          </div>
        </Link>
      </div>


      <div className="mt-10">
        <h2 className="font-display text-xl font-semibold">Modules</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.id}
                to="/tools/$tool"
                params={{ tool: m.id }}
                className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="inline-grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  {m.badge && (
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
                      {m.badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">{m.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                <span className="mt-3 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                  Open →
                </span>

              </Link>
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
