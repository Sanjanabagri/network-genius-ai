import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity, Eye, LogIn, ShieldAlert, Users } from "lucide-react";
import { getAdminStats } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPanel,
  head: () => ({
    meta: [
      { title: "Admin Panel · NetAssist AI" },
      { name: "description", content: "Track logins, page views and active users across NetAssist AI." },
      { property: "og:title", content: "Admin Panel · NetAssist AI" },
      { property: "og:description", content: "Track logins, page views and active users across NetAssist AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function Stat({ icon: Icon, label, value, sub }: { icon: typeof Users; label: string; value: number | string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function AdminPanel() {
  const fetchStats = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats", 30],
    queryFn: () => fetchStats({ data: { days: 30 } }),
    refetchInterval: 60000,
  });

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

  const maxDay = Math.max(1, ...data.daily.map((d) => d.logins + d.views));

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Admin panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">Usage analytics for the last 30 days. Auto-refreshes every minute.</p>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Users} label="Registered users" value={data.totalUsers} />
        <Stat icon={Activity} label="Active users" value={data.activeUsersToday} sub={`${data.activeUsers7d} in last 7 days`} />
        <Stat icon={LogIn} label="Logins" value={data.totalLogins} sub={`${data.loginsToday} today`} />
        <Stat icon={Eye} label="Page views" value={data.totalViews} sub={`${data.viewsToday} today`} />
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-sm font-semibold">Daily activity</h2>
        <div className="mt-4 flex h-40 items-end gap-1">
          {data.daily.map((d) => (
            <div key={d.date} className="group relative flex-1" title={`${d.date}: ${d.logins} logins, ${d.views} views`}>
              <div
                className="w-full rounded-t bg-primary/70"
                style={{ height: `${((d.logins + d.views) / maxDay) * 140}px` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>{data.daily[0]?.date}</span>
          <span>{data.daily[data.daily.length - 1]?.date}</span>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-semibold">Top pages</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.topPages.length === 0 && <li className="text-muted-foreground">No views yet.</li>}
            {data.topPages.map((p) => (
              <li key={p.path} className="flex items-center justify-between gap-3">
                <span className="truncate font-mono text-xs">{p.path}</span>
                <span className="text-muted-foreground">{p.views}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-display text-sm font-semibold">Most active users</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.topUsers.length === 0 && <li className="text-muted-foreground">No activity yet.</li>}
            {data.topUsers.map((u) => (
              <li key={u.user_id} className="flex items-center justify-between gap-3">
                <span className="truncate">{u.name}</span>
                <span className="text-xs text-muted-foreground">
                  {u.logins} logins · {u.views} views
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="font-display text-sm font-semibold">Recent activity</h2>
        <div className="mt-3 overflow-x-auto">
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
                  <td className="py-2 pr-4 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="py-2 pr-4 truncate">{e.name}</td>
                  <td className="py-2 pr-4">{e.event_type === "login" ? "Login" : "Page view"}</td>
                  <td className="py-2 font-mono text-xs">{e.path ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
