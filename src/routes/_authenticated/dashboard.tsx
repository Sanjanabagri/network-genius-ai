import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  FileCode2,
  FileText,
  GitBranch,
  GraduationCap,
  Layers,
  MessagesSquare,
  Plus,
  Rocket,
  Search,
  Shield,
  Sparkles,
  Terminal,
  Users,
  Wand2,
  Workflow,
} from "lucide-react";
import type { ToolId } from "@/lib/ai.functions";
import { listProjects } from "@/lib/saved-projects.functions";
import { listTeams } from "@/lib/teams.functions";
import { OnboardingWalkthrough } from "@/components/OnboardingWalkthrough";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · NetAssist AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

type ModuleCategory = "Config" | "Troubleshoot" | "Automate" | "Document";

const modules: {
  id: ToolId;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  category: ModuleCategory;
  badge?: string;
}[] = [
  { id: "multi-vendor", icon: Layers, title: "Multi-Vendor Config Generator", desc: "Cisco, Palo Alto, Fortinet, Juniper, Aruba…", category: "Config", badge: "New" },
  { id: "troubleshooter", icon: Search, title: "AI Network Troubleshooter", desc: "Upload logs & screenshots, get root cause", category: "Troubleshoot", badge: "New" },
  { id: "automation-studio", icon: FileCode2, title: "Automation Studio", desc: "Python, Netmiko, NAPALM, Nornir, Ansible, Terraform", category: "Automate", badge: "New" },
  { id: "config", icon: Wand2, title: "AI Config Generator", desc: "Cisco, Palo Alto, Fortinet, SD-WAN", category: "Config" },
  { id: "troubleshoot", icon: Terminal, title: "CLI Troubleshooter", desc: "Root cause from show output", category: "Troubleshoot" },
  { id: "script", icon: FileCode2, title: "Automation Scripts", desc: "Python, Ansible, Terraform", category: "Automate" },
  { id: "mop", icon: GitBranch, title: "MOP / Change Request", desc: "Steps, checks, rollback", category: "Document" },
  { id: "rollback", icon: GitBranch, title: "Rollback Plan", desc: "Backout with verification", category: "Document" },
  { id: "cli", icon: Activity, title: "CLI Output Analyzer", desc: "Read show/log output like a pro", category: "Troubleshoot" },
  { id: "docs", icon: FileText, title: "Network Documentation", desc: "Configs → docs, IP plans", category: "Document" },
  { id: "incident", icon: MessagesSquare, title: "Incident Summary", desc: "Timeline, RCA, action items", category: "Document" },
  { id: "workflow", icon: Workflow, title: "Workflow Designer", desc: "End-to-end automation", category: "Automate" },
];

const categoryBadge: Record<ModuleCategory, "default" | "secondary" | "outline" | "destructive"> = {
  Config: "default",
  Troubleshoot: "secondary",
  Automate: "outline",
  Document: "secondary",
};

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
  const teamsLoading = teams.isLoading;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      <div className="animate-fade-up">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Welcome back</p>
            <h1 className="mt-1 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Hi, {name} <span className="text-gradient">👋</span>
            </h1>
          </div>
          <Link
            to="/tools/$tool"
            params={{ tool: "multi-vendor" }}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" /> New generation
          </Link>
        </div>
        <p className="mt-2 text-muted-foreground">Your AI copilot is ready. Pick a module to get started.</p>
      </div>

      <OnboardingWalkthrough />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Generations today", value: todayCount, sub: "saved in the last 24h", to: "/projects" as string | null },
          { label: "Configurations", value: configCount, sub: "all-time", to: "/projects" },
          { label: "Scripts generated", value: scriptCount, sub: "all-time", to: "/projects" },
          { label: "Teams", value: teams.data?.length ?? 0, sub: "collaborate", to: "/teams" },
        ].map((s) => {
          const loading = s.label === "Teams" ? teamsLoading : loadingStats;
          const inner = loading ? (
            <>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-3 h-8 w-16" />
              <Skeleton className="mt-2 h-3 w-20" />
            </>
          ) : (
            <>
              <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{s.label}</div>
              <div className="mt-2 font-display text-3xl font-bold">{s.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
            </>
          );
          return s.to ? (
            <Link
              key={s.label}
              to={s.to}
              className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
            >
              {inner}
              <ArrowRight className="mt-3 h-4 w-4 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
            </Link>
          ) : (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
              {inner}
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          to="/teams"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-semibold">Teams &amp; collaboration</div>
            <div className="text-sm text-muted-foreground">Invite engineers, assign roles, share projects.</div>
          </div>
          <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 sm:block" />
        </Link>
        <Link
          to="/learn"
          className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent/20 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-base font-semibold">Learning Center</div>
            <div className="text-sm text-muted-foreground">Guided paths with prompts pre-loaded into the tools.</div>
          </div>
          <ArrowRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 sm:block" />
        </Link>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">AI modules</h2>
          <Badge variant="outline">{modules.length} tools</Badge>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.id}
                to="/tools/$tool"
                params={{ tool: m.id }}
                className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:shadow-elevated"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="inline-grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {m.badge && (
                      <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
                        {m.badge}
                      </span>
                    )}
                    <Badge variant={categoryBadge[m.category]} className="text-[10px]">
                      {m.category}
                    </Badge>
                  </div>
                </div>
                <h3 className="mt-3 font-display text-base font-semibold">{m.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-primary">
                  Open <ArrowRight className="h-3 w-3 transition group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Recent activity</h2>
          <Link to="/projects" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-card">
          {projects.isLoading ? (
            <div className="space-y-3 px-5 py-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-muted">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">No saved work yet</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Generate a configuration, script, or document and save it as a project to see it here.
              </p>
              <Link
                to="/tools/$tool"
                params={{ tool: "multi-vendor" }}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" /> Start generating
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    to="/projects/$id"
                    params={{ id: p.id }}
                    className="group flex items-center gap-3 px-5 py-3.5 transition hover:bg-muted/50"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {p.tool}
                        {p.vendor ? ` · ${p.vendor}` : ""}
                        {p.language ? ` · ${p.language}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100 sm:block" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <div className="mt-10 rounded-2xl border border-border bg-gradient-hero p-6 text-primary-foreground">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/10">
              <Shield className="h-5 w-5 text-accent" />
            </div>
            <div>
              <div className="font-display text-lg font-semibold">Secure your account</div>
              <div className="text-sm text-primary-foreground/80">Enable two-factor authentication in under a minute.</div>
            </div>
          </div>
          <Link
            to="/settings/security"
            className="inline-flex items-center gap-2 rounded-xl bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-background/90"
          >
            <Rocket className="h-4 w-4" /> Enable 2FA
          </Link>
        </div>
      </div>
    </main>
  );
}
