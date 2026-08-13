import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  CreditCard,
  Eye,
  FileClock,
  LayoutDashboard,
  LogIn,
  MessageSquareHeart,
  ScrollText,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getAdminOverview,
  getAdminUserDetail,
  getAuditLogs,
  listAdminUsers,
  logAdminAction,
  type AdminUserRow,
} from "@/lib/admin.functions";
import { FeedbackSection } from "@/components/admin/FeedbackSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_admin/admin")({
  component: AdminPanel,
  head: () => ({
    meta: [
      { title: "Admin Dashboard · NetAssist AI" },
      { name: "description", content: "Users, feature usage, AI analytics, activity and audit logs for NetAssist AI." },
      { property: "og:title", content: "Admin Dashboard · NetAssist AI" },
      { property: "og:description", content: "Users, feature usage, AI analytics, activity and audit logs for NetAssist AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type SectionId = "dashboard" | "users" | "features" | "ai" | "activity" | "saas" | "feedback" | "audit";

const SECTIONS: { id: SectionId; label: string; icon: typeof Users }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "features", label: "Feature Usage", icon: Sparkles },
  { id: "ai", label: "AI Analytics", icon: Bot },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "saas", label: "SaaS Metrics", icon: CreditCard },
  { id: "feedback", label: "Feedback", icon: MessageSquareHeart },
  { id: "audit", label: "Audit Logs", icon: ScrollText },
];

const CARD_ICONS: Record<string, typeof Users> = {
  users: Users,
  active: Activity,
  logins: LogIn,
  views: Eye,
  new_today: UserPlus,
  new_month: UserPlus,
  ai_today: Bot,
  ai_month: Bot,
};

const SERIES_COLORS = ["#6366f1", "#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#ef4444"];

function fmt(n: number | null | undefined) {
  return typeof n === "number" ? n.toLocaleString() : "N/A";
}

function fmtDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

function Panel({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  changePct,
}: {
  icon: typeof Users;
  label: string;
  value: number | string | null;
  sub?: string;
  changePct?: number | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">
        {typeof value === "number" ? value.toLocaleString() : (value ?? "N/A")}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {sub ? <span>{sub}</span> : null}
        {typeof changePct === "number" ? (
          <span className={changePct >= 0 ? "text-emerald-500" : "text-destructive"}>
            {changePct >= 0 ? "+" : ""}
            {changePct}% vs prev.
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ChartTooltipStyle() {
  return null;
}

function AdminPanel() {
  const [section, setSection] = useState<SectionId>("dashboard");
  const [days, setDays] = useState(30);
  const fetchOverview = useServerFn(getAdminOverview);
  const recordAction = useServerFn(logAdminAction);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview", days],
    queryFn: () => fetchOverview({ data: { days } }),
    refetchInterval: 120000,
  });

  useEffect(() => {
    if (!data?.isAdmin) return;
    if (sessionStorage.getItem("na_admin_access_logged")) return;
    sessionStorage.setItem("na_admin_access_logged", "1");
    void recordAction({ data: { action: "admin_panel_access", target: "/admin", status: "success" } }).catch(() => {});
  }, [data?.isAdmin, recordAction]);

  if (isLoading) {
    return <div className="mx-auto max-w-7xl px-4 py-10 text-sm text-muted-foreground sm:px-6">Loading analytics…</div>;
  }

  if (!data?.isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
        <h1 className="mt-4 font-display text-2xl font-bold">Admin access required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account does not have the admin role. Ask an existing admin to grant it.
        </p>
        <Link to="/dashboard" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row">
      <nav className="lg:w-56 lg:shrink-0">
        <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => setSection(s.id)}
                className={`flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                  section === s.id
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <s.icon className="h-4 w-4" /> {s.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 flex-1 space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">
              {SECTIONS.find((s) => s.id === section)?.label}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Live data from NetAssist AI · last {days} days · refreshes every 2 minutes.
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`rounded-md px-3 py-1 text-xs transition ${
                  days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </header>

        {section === "dashboard" ? <DashboardSection data={data} /> : null}
        {section === "users" ? <UsersSection /> : null}
        {section === "features" ? <FeaturesSection data={data} /> : null}
        {section === "ai" ? <AiSection data={data} /> : null}
        {section === "activity" ? <ActivitySection data={data} /> : null}
        {section === "saas" ? <SaasSection data={data} /> : null}
        {section === "feedback" ? <FeedbackSection /> : null}
        {section === "audit" ? <AuditSection /> : null}
        <ChartTooltipStyle />
      </div>
    </div>
  );
}

type Overview = NonNullable<Awaited<ReturnType<typeof getAdminOverview>>>;

function DashboardSection({ data }: { data: Overview }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {data.cards.map((c) => (
          <StatCard
            key={c.key}
            icon={CARD_ICONS[c.key] ?? BarChart3}
            label={c.label}
            value={c.value}
            sub={c.sub}
            changePct={c.changePct ?? null}
          />
        ))}
      </div>

      <Panel title="Daily activity">
        <ActivityChart daily={data.daily} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top pages">
          <ul className="space-y-2 text-sm">
            {data.topPages.length === 0 && <li className="text-muted-foreground">No views yet.</li>}
            {data.topPages.map((p) => (
              <li key={p.path} className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-xs">{p.path}</span>
                <span className="text-muted-foreground">{p.views}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Most used AI features">
          <ul className="space-y-2 text-sm">
            {data.features.length === 0 && <li className="text-muted-foreground">No AI requests recorded yet.</li>}
            {data.features.slice(0, 8).map((f) => (
              <li key={f.tool} className="flex items-center justify-between gap-3">
                <span className="truncate">{f.label}</span>
                <span className="text-xs text-muted-foreground">
                  {f.total} requests · {f.uniqueUsers} users
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Recent activity">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">When</th>
                <th className="py-2 pr-4 font-medium">User</th>
                <th className="py-2 pr-4 font-medium">Event</th>
                <th className="py-2 font-medium">Path</th>
              </tr>
            </thead>
            <tbody>
              {data.recent.map((e) => (
                <tr key={e.id} className="border-t border-border/60">
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{fmtDate(e.created_at)}</td>
                  <td className="py-2 pr-4 truncate">{e.name}</td>
                  <td className="py-2 pr-4">{e.event_type === "login" ? "Login" : "Page view"}</td>
                  <td className="py-2 font-mono text-xs">{e.path ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function ActivityChart({ daily }: { daily: Overview["daily"] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={daily} margin={{ left: -20, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} minTickGap={20} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontSize: 12,
              color: "var(--foreground)",
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Area type="monotone" dataKey="users" name="Active users" stroke={SERIES_COLORS[4]} fill={SERIES_COLORS[4]} fillOpacity={0.15} />
          <Area type="monotone" dataKey="logins" name="Logins" stroke={SERIES_COLORS[0]} fill={SERIES_COLORS[0]} fillOpacity={0.15} />
          <Area type="monotone" dataKey="views" name="Page views" stroke={SERIES_COLORS[1]} fill={SERIES_COLORS[1]} fillOpacity={0.15} />
          <Area type="monotone" dataKey="ai" name="AI requests" stroke={SERIES_COLORS[2]} fill={SERIES_COLORS[2]} fillOpacity={0.15} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FeaturesSection({ data }: { data: Overview }) {
  const top = data.features[0];
  const series = useMemo(
    () =>
      data.featureSeries.map((d) => ({
        date: d.date,
        ...Object.fromEntries(data.features.slice(0, 5).map((f) => [f.label, d.counts[f.tool] ?? 0])),
      })),
    [data],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Bot} label="Total AI requests" value={data.ai.total} />
        <StatCard icon={Sparkles} label="Features used" value={data.features.length} />
        <StatCard icon={BarChart3} label="Most-used feature" value={top ? top.label : "N/A"} sub={top ? `${top.total} requests` : undefined} />
        <StatCard icon={Users} label="Unique AI users" value={data.ai.perUser.length} />
      </div>

      <Panel title="Usage by feature">
        {data.features.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No AI requests recorded yet. Usage is captured from this point forward for every NetAssist AI tool.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">Feature</th>
                  <th className="py-2 pr-4 font-medium">Total</th>
                  <th className="py-2 pr-4 font-medium">Today</th>
                  <th className="py-2 pr-4 font-medium">This week</th>
                  <th className="py-2 pr-4 font-medium">This month</th>
                  <th className="py-2 font-medium">Unique users</th>
                </tr>
              </thead>
              <tbody>
                {data.features.map((f) => (
                  <tr key={f.tool} className="border-t border-border/60">
                    <td className="py-2 pr-4">{f.label}</td>
                    <td className="py-2 pr-4">{f.total}</td>
                    <td className="py-2 pr-4">{f.today}</td>
                    <td className="py-2 pr-4">{f.week}</td>
                    <td className="py-2 pr-4">{f.month}</td>
                    <td className="py-2">{f.uniqueUsers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Feature usage over time (top 5)">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} minTickGap={20} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {data.features.slice(0, 5).map((f, i) => (
                <Line key={f.tool} type="monotone" dataKey={f.label} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );
}

function AiSection({ data }: { data: Overview }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Bot} label="Total requests" value={data.ai.total} />
        <StatCard icon={Sparkles} label="Successful" value={data.ai.success} sub={data.ai.successRate !== null ? `${data.ai.successRate}% success rate` : undefined} />
        <StatCard icon={ShieldAlert} label="Failed" value={data.ai.failed} />
        <StatCard icon={FileClock} label="Avg. duration" value={data.ai.avgDurationMs !== null ? `${data.ai.avgDurationMs} ms` : "N/A"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Tokens & cost">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Tokens used</dt>
              <dd>{data.ai.tokens === null ? "Not available" : fmt(data.ai.tokens)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Estimated cost</dt>
              <dd>{data.ai.estimatedCost === null ? "Not available" : `$${data.ai.estimatedCost}`}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Token counts are stored whenever the AI provider returns usage data; cost pricing is not exposed by the
            gateway yet, so no estimate is shown rather than a made-up figure.
          </p>
        </Panel>

        <Panel title="Requests per user (top 10)">
          <ul className="space-y-2 text-sm">
            {data.ai.perUser.length === 0 && <li className="text-muted-foreground">No AI requests yet.</li>}
            {data.ai.perUser.map((u) => (
              <li key={u.user_id} className="flex items-center justify-between gap-3">
                <span className="truncate">{u.name}</span>
                <span className="text-xs text-muted-foreground">{u.requests}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Requests per feature">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.features} margin={{ left: -20, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="total" name="Requests" fill={SERIES_COLORS[0]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Recent failures">
        {data.ai.recentFailures.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failed AI requests recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">When</th>
                  <th className="py-2 pr-4 font-medium">User</th>
                  <th className="py-2 pr-4 font-medium">Feature</th>
                  <th className="py-2 font-medium">Error</th>
                </tr>
              </thead>
              <tbody>
                {data.ai.recentFailures.map((f) => (
                  <tr key={f.id} className="border-t border-border/60">
                    <td className="py-2 pr-4 text-xs text-muted-foreground">{fmtDate(f.created_at)}</td>
                    <td className="py-2 pr-4">{f.name}</td>
                    <td className="py-2 pr-4">{f.tool}</td>
                    <td className="py-2 text-xs text-muted-foreground">{f.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ActivitySection({ data }: { data: Overview }) {
  return (
    <div className="space-y-6">
      <Panel title="Daily users, logins, page views and AI requests">
        <ActivityChart daily={data.daily} />
      </Panel>
      <Panel title="Daily breakdown">
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Active users</th>
                <th className="py-2 pr-4 font-medium">Logins</th>
                <th className="py-2 pr-4 font-medium">Page views</th>
                <th className="py-2 font-medium">AI requests</th>
              </tr>
            </thead>
            <tbody>
              {[...data.daily].reverse().map((d) => (
                <tr key={d.date} className="border-t border-border/60">
                  <td className="py-2 pr-4">{d.date}</td>
                  <td className="py-2 pr-4">{d.users}</td>
                  <td className="py-2 pr-4">{d.logins}</td>
                  <td className="py-2 pr-4">{d.views}</td>
                  <td className="py-2">{d.ai}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function SaasSection({ data }: { data: Overview }) {
  const s = data.saas;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={s.totalUsers} />
        <StatCard icon={Activity} label="Daily active users" value={s.dau} />
        <StatCard icon={Activity} label="Weekly active users" value={s.wau} />
        <StatCard icon={Activity} label="Monthly active users" value={s.mau} />
        <StatCard icon={UserPlus} label="New users today" value={s.newToday} />
        <StatCard icon={UserPlus} label="New users this month" value={s.newThisMonth} />
        <StatCard icon={BarChart3} label="User growth" value={s.growthPct === null ? "N/A" : `${s.growthPct}%`} sub={`vs previous ${data.days} days`} />
        <StatCard icon={Activity} label="7-day retention" value={s.retention7d === null ? "N/A" : `${s.retention7d}%`} sub="users older than 7d active this week" />
      </div>

      <Panel title="Revenue & subscriptions">
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <CreditCard className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Billing not configured yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
            Free/paid split, conversion rate, MRR, new subscriptions and cancellations become available once a payment
            provider (e.g. Stripe) is connected. Nothing is estimated here on purpose.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-left sm:grid-cols-3">
            {["Free users", "Paid users", "Conversion rate", "MRR", "New subscriptions", "Cancellations"].map((label) => (
              <div key={label} className="rounded-lg border border-border p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="mt-1 text-sm font-medium">Not available</div>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}

function UsersSection() {
  const fetchUsers = useServerFn(listAdminUsers);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"all" | "active" | "inactive" | "disabled">("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "signup_at" | "last_login" | "ai_requests" | "last_activity">("signup_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [detailId, setDetailId] = useState<string | null>(null);
  const pageSize = 20;

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isFetching } = useQuery({
    queryKey: ["admin-users", debounced, page, status, sortBy, sortDir],
    queryFn: () => fetchUsers({ data: { search: debounced, page, pageSize, status, sortBy, sortDir } }),
    staleTime: 30000,
  });

  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  function toggleSort(key: typeof sortBy) {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      setSortDir("desc");
    }
  }

  const columns: { key: typeof sortBy | "status" | "plan"; label: string; sortable?: boolean }[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "email", label: "Email", sortable: true },
    { key: "signup_at", label: "Signup", sortable: true },
    { key: "last_login", label: "Last login", sortable: true },
    { key: "status", label: "Status" },
    { key: "ai_requests", label: "AI requests", sortable: true },
    { key: "last_activity", label: "Last activity", sortable: true },
    { key: "plan", label: "Plan" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email…"
          className="h-9 max-w-xs"
        />
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {(["all", "active", "inactive", "disabled"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setStatus(s);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1 text-xs capitalize transition ${
                status === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {isFetching ? "Loading…" : `${data?.total ?? 0} user(s)`}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className="px-3 py-2 font-medium">
                  {c.sortable ? (
                    <button type="button" className="hover:text-foreground" onClick={() => toggleSort(c.key as typeof sortBy)}>
                      {c.label}
                      {sortBy === c.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-6 text-muted-foreground">
                  No users match this filter.
                </td>
              </tr>
            )}
            {(data?.rows ?? []).map((u: AdminUserRow) => (
              <tr key={u.user_id} className="border-t border-border/60">
                <td className="max-w-[160px] truncate px-3 py-2">{u.name}</td>
                <td className="max-w-[200px] truncate px-3 py-2 text-muted-foreground">{u.email ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(u.signup_at)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(u.last_login)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                      u.status === "active"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : u.status === "disabled"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-3 py-2">{u.ai_requests}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{fmtDate(u.last_activity)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{u.plan ?? "Not available"}</td>
                <td className="px-3 py-2 text-right">
                  <Button variant="ghost" size="sm" onClick={() => setDetailId(u.user_id)}>
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      <UserDetailDialog userId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}

function UserDetailDialog({ userId, onClose }: { userId: string | null; onClose: () => void }) {
  const fetchDetail = useServerFn(getAdminUserDetail);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-detail", userId],
    queryFn: () => fetchDetail({ data: { userId: userId as string } }),
    enabled: Boolean(userId),
  });

  return (
    <Dialog open={userId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{data?.account.name || data?.account.email || "User details"}</DialogTitle>
          <DialogDescription>Account, activity and AI usage. No credentials or tokens are exposed.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-4 overflow-auto">
          {isLoading || !data ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <section className="grid gap-2 rounded-lg border border-border p-3 text-sm sm:grid-cols-2">
                <div><span className="text-muted-foreground">Email: </span>{data.account.email ?? "—"}</div>
                <div><span className="text-muted-foreground">Signed up: </span>{fmtDate(data.account.signup_at)}</div>
                <div><span className="text-muted-foreground">Last login: </span>{fmtDate(data.account.last_login)}</div>
                <div><span className="text-muted-foreground">Email confirmed: </span>{data.account.email_confirmed ? "Yes" : "No"}</div>
                <div><span className="text-muted-foreground">Company: </span>{data.account.company ?? "—"}</div>
                <div><span className="text-muted-foreground">Job title: </span>{data.account.job_title ?? "—"}</div>
                <div><span className="text-muted-foreground">Providers: </span>{data.account.providers.join(", ") || "—"}</div>
                <div><span className="text-muted-foreground">Roles: </span>{data.account.roles.join(", ") || "user"}</div>
                <div><span className="text-muted-foreground">Plan: </span>Not available (billing not configured)</div>
                <div><span className="text-muted-foreground">AI requests: </span>{data.aiTotal}</div>
              </section>

              <section>
                <h3 className="text-sm font-semibold">AI feature usage</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  {data.aiUsage.length === 0 && <li className="text-muted-foreground">No AI requests yet.</li>}
                  {data.aiUsage.map((f) => (
                    <li key={f.tool} className="flex justify-between">
                      <span>{f.label}</span>
                      <span className="text-muted-foreground">{f.count}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Login history</h3>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {data.logins.length === 0 && <li>No logins recorded.</li>}
                    {data.logins.map((l) => (
                      <li key={l.id}>{fmtDate(l.created_at)}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Page activity</h3>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {data.pageViews.length === 0 && <li>No page views recorded.</li>}
                    {data.pageViews.slice(0, 40).map((p) => (
                      <li key={p.id} className="flex justify-between gap-2">
                        <span className="truncate font-mono">{p.path ?? "—"}</span>
                        <span>{new Date(p.created_at).toLocaleDateString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AuditSection() {
  const fetchLogs = useServerFn(getAuditLogs);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const { data } = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: () => fetchLogs({ data: { page, pageSize } }),
  });
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));

  return (
    <div className="space-y-4">
      <Panel title="Admin audit log">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">Timestamp</th>
                <th className="py-2 pr-4 font-medium">Admin</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium">Target</th>
                <th className="py-2 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-muted-foreground">
                    No admin actions recorded yet.
                  </td>
                </tr>
              )}
              {(data?.rows ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border/60">
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{fmtDate(r.created_at)}</td>
                  <td className="py-2 pr-4">{r.actor}</td>
                  <td className="py-2 pr-4">{r.action}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{r.target ?? "—"}</td>
                  <td className="py-2">
                    <span className={r.status === "success" ? "text-emerald-500" : "text-destructive"}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
