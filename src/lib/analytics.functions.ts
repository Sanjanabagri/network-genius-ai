import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const EventSchema = z.object({
  event_type: z.enum(["login", "page_view"]),
  path: z.string().max(512).optional(),
  referrer: z.string().max(512).optional(),
  session_id: z.string().max(128).optional(),
});

export type AppEvent = {
  id: string;
  user_id: string | null;
  event_type: string;
  path: string | null;
  session_id: string | null;
  created_at: string;
};

export type AdminStats = {
  isAdmin: boolean;
  totalUsers: number;
  totalLogins: number;
  totalViews: number;
  loginsToday: number;
  viewsToday: number;
  activeUsersToday: number;
  activeUsers7d: number;
  daily: { date: string; logins: number; views: number }[];
  topPages: { path: string; views: number }[];
  topUsers: { user_id: string; name: string; logins: number; views: number; last_seen: string }[];
  recent: (AppEvent & { name: string })[];
  /** All events in range (capped), used for drilldowns. */
  events: (AppEvent & { name: string })[];
  /** Every registered user with their activity in range. */
  users: { user_id: string; name: string; logins: number; views: number; last_seen: string | null }[];
};

export const trackEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => EventSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("app_events").insert({
      user_id: context.userId,
      event_type: data.event_type,
      path: data.path ?? null,
      referrer: data.referrer ?? null,
      session_id: data.session_id ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    return { isAdmin: Boolean(data) };
  });

const RangeSchema = z.object({ days: z.number().int().min(1).max(90).default(30) });

export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RangeSchema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<AdminStats> => {
    const { supabase, userId } = context;

    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    const empty: AdminStats = {
      isAdmin: false,
      totalUsers: 0,
      totalLogins: 0,
      totalViews: 0,
      loginsToday: 0,
      viewsToday: 0,
      activeUsersToday: 0,
      activeUsers7d: 0,
      daily: [],
      topPages: [],
      topUsers: [],
      recent: [],
      events: [],
      users: [],
    };
    if (!roleRow) return empty;

    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

    const [{ data: events }, { count: userCount }, { data: profiles }] = await Promise.all([
      supabase
        .from("app_events")
        .select("id,user_id,event_type,path,session_id,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20000),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id,full_name"),
    ]);

    const rows = (events ?? []) as AppEvent[];
    const names = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? ""]));

    const dailyMap = new Map<string, { logins: number; views: number }>();
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      dailyMap.set(d, { logins: 0, views: 0 });
    }
    const pages = new Map<string, number>();
    const byUser = new Map<string, { logins: number; views: number; last_seen: string }>();
    const todayUsers = new Set<string>();
    const weekUsers = new Set<string>();

    let totalLogins = 0;
    let totalViews = 0;
    let loginsToday = 0;
    let viewsToday = 0;

    for (const row of rows) {
      const isLogin = row.event_type === "login";
      const created = new Date(row.created_at);
      const day = row.created_at.slice(0, 10);
      const bucket = dailyMap.get(day);
      if (bucket) bucket[isLogin ? "logins" : "views"] += 1;

      if (isLogin) totalLogins += 1;
      else {
        totalViews += 1;
        if (row.path) pages.set(row.path, (pages.get(row.path) ?? 0) + 1);
      }

      if (created >= startOfToday) {
        if (isLogin) loginsToday += 1;
        else viewsToday += 1;
        if (row.user_id) todayUsers.add(row.user_id);
      }
      if (created >= sevenDaysAgo && row.user_id) weekUsers.add(row.user_id);

      if (row.user_id) {
        const u = byUser.get(row.user_id) ?? { logins: 0, views: 0, last_seen: row.created_at };
        u[isLogin ? "logins" : "views"] += 1;
        if (row.created_at > u.last_seen) u.last_seen = row.created_at;
        byUser.set(row.user_id, u);
      }
    }

    return {
      isAdmin: true,
      totalUsers: userCount ?? 0,
      totalLogins,
      totalViews,
      loginsToday,
      viewsToday,
      activeUsersToday: todayUsers.size,
      activeUsers7d: weekUsers.size,
      daily: [...dailyMap.entries()].map(([date, v]) => ({ date, ...v })),
      topPages: [...pages.entries()]
        .map(([path, views]) => ({ path, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
      topUsers: [...byUser.entries()]
        .map(([user_id, v]) => ({ user_id, name: names.get(user_id) || user_id.slice(0, 8), ...v }))
        .sort((a, b) => b.views + b.logins - (a.views + a.logins))
        .slice(0, 10),
      recent: withNames.slice(0, 30),
      events: withNames.slice(0, 2000),
      users: [...names.entries()]
        .map(([user_id, n]) => {
          const v = byUser.get(user_id);
          return {
            user_id,
            name: n || user_id.slice(0, 8),
            logins: v?.logins ?? 0,
            views: v?.views ?? 0,
            last_seen: v?.last_seen ?? null,
          };
        })
        .sort((a, b) => (b.last_seen ?? "").localeCompare(a.last_seen ?? "")),
    };
  });
