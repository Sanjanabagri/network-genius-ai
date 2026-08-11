import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import {
  type AuthUserLite,
  type RawAiRequest,
  type RawEvent,
  daysAgoISO,
  emptyDailyBuckets,
  pctChange,
  startOfMonthISO,
  startOfTodayISO,
  toolLabel,
} from "@/lib/admin-metrics.server";

export type OverviewCard = {
  key: string;
  label: string;
  value: number | null;
  sub?: string;
  changePct?: number | null;
};

export type AdminOverview = {
  isAdmin: boolean;
  days: number;
  cards: OverviewCard[];
  daily: { date: string; logins: number; views: number; ai: number; users: number }[];
  topPages: { path: string; views: number }[];
  features: {
    tool: string;
    label: string;
    total: number;
    today: number;
    week: number;
    month: number;
    uniqueUsers: number;
  }[];
  featureSeries: { date: string; counts: Record<string, number> }[];
  ai: {
    total: number;
    success: number;
    failed: number;
    successRate: number | null;
    tokens: number | null;
    estimatedCost: number | null;
    avgDurationMs: number | null;
    perUser: { user_id: string; name: string; requests: number }[];
    recentFailures: { id: string; created_at: string; tool: string; name: string; error: string }[];
  };
  saas: {
    totalUsers: number;
    dau: number;
    wau: number;
    mau: number;
    newToday: number;
    newThisMonth: number;
    growthPct: number | null;
    retention7d: number | null;
    billingConfigured: boolean;
  };
  recent: { id: string; created_at: string; name: string; event_type: string; path: string | null }[];
};

export type AdminUserRow = {
  user_id: string;
  name: string;
  email: string | null;
  signup_at: string;
  last_login: string | null;
  status: string;
  ai_requests: number;
  last_activity: string | null;
  plan: string | null;
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ days: z.number().int().min(1).max(90).default(30) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<AdminOverview> => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    const days = data.days;
    if (!roleRow) {
      return {
        isAdmin: false,
        days,
        cards: [],
        daily: [],
        topPages: [],
        features: [],
        featureSeries: [],
        ai: {
          total: 0,
          success: 0,
          failed: 0,
          successRate: null,
          tokens: null,
          estimatedCost: null,
          avgDurationMs: null,
          perUser: [],
          recentFailures: [],
        },
        saas: {
          totalUsers: 0,
          dau: 0,
          wau: 0,
          mau: 0,
          newToday: 0,
          newThisMonth: 0,
          growthPct: null,
          retention7d: null,
          billingConfigured: false,
        },
        recent: [],
      };
    }

    const since = daysAgoISO(days);
    const prevSince = daysAgoISO(days * 2);
    const todayISO = startOfTodayISO();
    const monthISO = startOfMonthISO();

    const [{ data: events }, { data: prevEvents }, { data: aiRows }, { data: prevAi }, { data: profiles }, { data: failures }] =
      await Promise.all([
        supabase
          .from("app_events")
          .select("id,user_id,event_type,path,created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20000),
        supabase
          .from("app_events")
          .select("id,user_id,event_type,created_at")
          .gte("created_at", prevSince)
          .lt("created_at", since)
          .limit(20000),
        supabase
          .from("ai_requests")
          .select("id,user_id,tool,status,total_tokens,duration_ms,created_at")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(20000),
        supabase
          .from("ai_requests")
          .select("id")
          .gte("created_at", prevSince)
          .lt("created_at", since)
          .limit(20000),
        supabase.from("profiles").select("id,full_name"),
        supabase
          .from("ai_requests")
          .select("id,user_id,tool,error_message,created_at")
          .eq("status", "error")
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

    const names = new Map(
      (profiles ?? []).map((p) => [p.id as string, ((p.full_name as string | null) ?? "") as string]),
    );
    const nameOf = (id: string | null) =>
      (id && (names.get(id) || id.slice(0, 8))) || "unknown";

    const rows = (events ?? []) as RawEvent[];
    const ai = (aiRows ?? []) as RawAiRequest[];

    // ---- auth users (emails, signup dates) via privileged client, admin-verified above
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const authUsers: AuthUserLite[] = [];
    for (let page = 1; page <= 10; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      const batch = list?.users ?? [];
      for (const u of batch) {
        authUsers.push({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          banned: Boolean((u as { banned_until?: string | null }).banned_until),
        });
      }
      if (batch.length < 1000) break;
    }

    const buckets = emptyDailyBuckets(days);
    const pages = new Map<string, number>();
    const todayUsers = new Set<string>();
    const weekUsers = new Set<string>();
    const monthUsers = new Set<string>();
    let logins = 0;
    let views = 0;
    let loginsToday = 0;
    let viewsToday = 0;

    const weekISO = daysAgoISO(7);
    const mauISO = daysAgoISO(30);

    for (const r of rows) {
      const isLogin = r.event_type === "login";
      const b = buckets.get(r.created_at.slice(0, 10));
      if (b) {
        b[isLogin ? "logins" : "views"] += 1;
        if (r.user_id) b.users.add(r.user_id);
      }
      if (isLogin) logins += 1;
      else {
        views += 1;
        if (r.path) pages.set(r.path, (pages.get(r.path) ?? 0) + 1);
      }
      if (r.created_at >= todayISO) {
        if (isLogin) loginsToday += 1;
        else viewsToday += 1;
        if (r.user_id) todayUsers.add(r.user_id);
      }
      if (r.created_at >= weekISO && r.user_id) weekUsers.add(r.user_id);
      if (r.created_at >= mauISO && r.user_id) monthUsers.add(r.user_id);
    }

    const prevLogins = (prevEvents ?? []).filter((e) => e.event_type === "login").length;
    const prevViews = (prevEvents ?? []).length - prevLogins;

    // ---- feature usage
    type FeatureAgg = { total: number; today: number; week: number; month: number; users: Set<string> };
    const byTool = new Map<string, FeatureAgg>();
    const featureDaily = new Map<string, Record<string, number>>();
    for (const [d] of buckets) featureDaily.set(d, {});

    let aiSuccess = 0;
    let aiFailed = 0;
    let aiToday = 0;
    let aiMonth = 0;
    let tokens = 0;
    let tokenRows = 0;
    let durSum = 0;
    let durRows = 0;
    const aiPerUser = new Map<string, number>();

    for (const r of ai) {
      const agg = byTool.get(r.tool) ?? { total: 0, today: 0, week: 0, month: 0, users: new Set<string>() };
      agg.total += 1;
      if (r.created_at >= todayISO) agg.today += 1;
      if (r.created_at >= weekISO) agg.week += 1;
      if (r.created_at >= monthISO) agg.month += 1;
      if (r.user_id) agg.users.add(r.user_id);
      byTool.set(r.tool, agg);

      const day = r.created_at.slice(0, 10);
      const fd = featureDaily.get(day);
      if (fd) fd[r.tool] = (fd[r.tool] ?? 0) + 1;
      const b = buckets.get(day);
      if (b) b.ai += 1;

      if (r.status === "error") aiFailed += 1;
      else aiSuccess += 1;
      if (r.created_at >= todayISO) aiToday += 1;
      if (r.created_at >= monthISO) aiMonth += 1;
      if (typeof r.total_tokens === "number") {
        tokens += r.total_tokens;
        tokenRows += 1;
      }
      if (typeof r.duration_ms === "number") {
        durSum += r.duration_ms;
        durRows += 1;
      }
      if (r.user_id) aiPerUser.set(r.user_id, (aiPerUser.get(r.user_id) ?? 0) + 1);
    }

    const newToday = authUsers.filter((u) => u.created_at >= todayISO).length;
    const newThisMonth = authUsers.filter((u) => u.created_at >= monthISO).length;
    const newInRange = authUsers.filter((u) => u.created_at >= since).length;
    const newPrevRange = authUsers.filter((u) => u.created_at >= prevSince && u.created_at < since).length;

    // retention: users created >7d ago who were active in the last 7 days
    const eligible = authUsers.filter((u) => u.created_at < weekISO);
    const retained = eligible.filter((u) => weekUsers.has(u.id)).length;

    const cards: OverviewCard[] = [
      { key: "users", label: "Registered users", value: authUsers.length },
      {
        key: "active",
        label: "Active users",
        value: todayUsers.size,
        sub: `${weekUsers.size} in last 7 days`,
      },
      { key: "logins", label: "Logins", value: logins, sub: `${loginsToday} today`, changePct: pctChange(logins, prevLogins) },
      { key: "views", label: "Page views", value: views, sub: `${viewsToday} today`, changePct: pctChange(views, prevViews) },
      { key: "new_today", label: "New users today", value: newToday },
      { key: "new_month", label: "New users this month", value: newThisMonth },
      { key: "ai_today", label: "AI requests today", value: aiToday },
      {
        key: "ai_month",
        label: "AI requests this month",
        value: aiMonth,
        changePct: pctChange(ai.length, (prevAi ?? []).length),
      },
    ];

    return {
      isAdmin: true,
      days,
      cards,
      daily: [...buckets.entries()].map(([date, v]) => ({
        date,
        logins: v.logins,
        views: v.views,
        ai: v.ai,
        users: v.users.size,
      })),
      topPages: [...pages.entries()]
        .map(([path, v]) => ({ path, views: v }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10),
      features: [...byTool.entries()]
        .map(([tool, v]) => ({
          tool,
          label: toolLabel(tool),
          total: v.total,
          today: v.today,
          week: v.week,
          month: v.month,
          uniqueUsers: v.users.size,
        }))
        .sort((a, b) => b.total - a.total),
      featureSeries: [...featureDaily.entries()].map(([date, counts]) => ({ date, counts })),
      ai: {
        total: ai.length,
        success: aiSuccess,
        failed: aiFailed,
        successRate: ai.length ? Math.round((aiSuccess / ai.length) * 1000) / 10 : null,
        tokens: tokenRows > 0 ? tokens : null,
        estimatedCost: null,
        avgDurationMs: durRows > 0 ? Math.round(durSum / durRows) : null,
        perUser: [...aiPerUser.entries()]
          .map(([user_id, requests]) => ({ user_id, name: nameOf(user_id), requests }))
          .sort((a, b) => b.requests - a.requests)
          .slice(0, 10),
        recentFailures: (failures ?? []).map((f) => ({
          id: f.id as string,
          created_at: f.created_at as string,
          tool: toolLabel(f.tool as string),
          name: nameOf((f.user_id as string | null) ?? null),
          error: ((f.error_message as string | null) ?? "").slice(0, 300),
        })),
      },
      saas: {
        totalUsers: authUsers.length,
        dau: todayUsers.size,
        wau: weekUsers.size,
        mau: monthUsers.size,
        newToday,
        newThisMonth,
        growthPct: pctChange(newInRange, newPrevRange),
        retention7d: eligible.length ? Math.round((retained / eligible.length) * 1000) / 10 : null,
        billingConfigured: false,
      },
      recent: rows.slice(0, 30).map((r) => ({
        id: r.id,
        created_at: r.created_at,
        name: nameOf(r.user_id),
        event_type: r.event_type,
        path: r.path,
      })),
    };
  });

export const listAdminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        search: z.string().max(120).default(""),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(5).max(100).default(20),
        sortBy: z.enum(["name", "email", "signup_at", "last_login", "ai_requests", "last_activity"]).default("signup_at"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
        status: z.enum(["all", "active", "inactive", "disabled"]).default("all"),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<{ isAdmin: boolean; total: number; rows: AdminUserRow[] }> => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return { isAdmin: false, total: 0, rows: [] };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const authUsers: AuthUserLite[] = [];
    for (let page = 1; page <= 10; page++) {
      const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      const batch = list?.users ?? [];
      for (const u of batch) {
        authUsers.push({
          id: u.id,
          email: u.email ?? null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at ?? null,
          banned: Boolean((u as { banned_until?: string | null }).banned_until),
        });
      }
      if (batch.length < 1000) break;
    }

    const [{ data: profiles }, { data: aiRows }, { data: events }] = await Promise.all([
      supabase.from("profiles").select("id,full_name"),
      supabase.from("ai_requests").select("user_id").limit(50000),
      supabase
        .from("app_events")
        .select("user_id,created_at")
        .gte("created_at", daysAgoISO(90))
        .order("created_at", { ascending: false })
        .limit(50000),
    ]);

    const names = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? ""]));
    const aiCount = new Map<string, number>();
    for (const r of aiRows ?? []) {
      const id = r.user_id as string | null;
      if (id) aiCount.set(id, (aiCount.get(id) ?? 0) + 1);
    }
    const lastActivity = new Map<string, string>();
    for (const e of events ?? []) {
      const id = e.user_id as string | null;
      if (id && !lastActivity.has(id)) lastActivity.set(id, e.created_at as string);
    }

    const weekISO = daysAgoISO(7);
    let rows: AdminUserRow[] = authUsers.map((u) => {
      const last = lastActivity.get(u.id) ?? u.last_sign_in_at ?? null;
      return {
        user_id: u.id,
        name: names.get(u.id) || (u.email?.split("@")[0] ?? u.id.slice(0, 8)),
        email: u.email,
        signup_at: u.created_at,
        last_login: u.last_sign_in_at,
        status: u.banned ? "disabled" : last && last >= weekISO ? "active" : "inactive",
        ai_requests: aiCount.get(u.id) ?? 0,
        last_activity: last,
        plan: null,
      };
    });

    const q = data.search.trim().toLowerCase();
    if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q));
    if (data.status !== "all") rows = rows.filter((r) => r.status === data.status);

    const dir = data.sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const key = data.sortBy;
      const av = (a[key] ?? "") as string | number;
      const bv = (b[key] ?? "") as string | number;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });

    const total = rows.length;
    const start = (data.page - 1) * data.pageSize;
    return { isAdmin: true, total, rows: rows.slice(start, start + data.pageSize) };
  });

export const getAdminUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(data.userId);

    const [{ data: profile }, { data: events }, { data: aiRows }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("full_name,company,job_title,years_experience,created_at").eq("id", data.userId).maybeSingle(),
      supabase
        .from("app_events")
        .select("id,event_type,path,created_at")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("ai_requests")
        .select("id,tool,status,total_tokens,created_at")
        .eq("user_id", data.userId)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("user_roles").select("role").eq("user_id", data.userId),
    ]);

    const perTool = new Map<string, number>();
    for (const r of aiRows ?? []) perTool.set(r.tool as string, (perTool.get(r.tool as string) ?? 0) + 1);

    return {
      account: {
        user_id: data.userId,
        email: authUser?.user?.email ?? null,
        name: (profile?.full_name as string | null) ?? null,
        company: (profile?.company as string | null) ?? null,
        job_title: (profile?.job_title as string | null) ?? null,
        signup_at: authUser?.user?.created_at ?? null,
        last_login: authUser?.user?.last_sign_in_at ?? null,
        email_confirmed: Boolean(authUser?.user?.email_confirmed_at),
        providers: (authUser?.user?.app_metadata?.providers as string[] | undefined) ?? [],
        roles: (roles ?? []).map((r) => r.role as string),
        plan: null as string | null,
      },
      logins: (events ?? [])
        .filter((e) => e.event_type === "login")
        .slice(0, 50)
        .map((e) => ({ id: e.id as string, created_at: e.created_at as string })),
      pageViews: (events ?? [])
        .filter((e) => e.event_type !== "login")
        .slice(0, 100)
        .map((e) => ({ id: e.id as string, path: (e.path as string | null) ?? null, created_at: e.created_at as string })),
      aiUsage: [...perTool.entries()]
        .map(([tool, count]) => ({ tool, label: toolLabel(tool), count }))
        .sort((a, b) => b.count - a.count),
      recent: (events ?? []).slice(0, 30).map((e) => ({
        id: e.id as string,
        event_type: e.event_type as string,
        path: (e.path as string | null) ?? null,
        created_at: e.created_at as string,
      })),
      aiTotal: (aiRows ?? []).length,
    };
  });

export const getAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(100).default(25) }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return { isAdmin: false, total: 0, rows: [] as { id: string; created_at: string; actor: string; action: string; target: string | null; status: string; details: string | null }[] };

    const from = (data.page - 1) * data.pageSize;
    const [{ data: rows, count }, { data: profiles }] = await Promise.all([
      supabase
        .from("admin_audit_logs")
        .select("id,actor_id,action,target,details,status,created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, from + data.pageSize - 1),
      supabase.from("profiles").select("id,full_name"),
    ]);
    const names = new Map((profiles ?? []).map((p) => [p.id as string, (p.full_name as string | null) ?? ""]));

    return {
      isAdmin: true,
      total: count ?? 0,
      rows: (rows ?? []).map((r) => ({
        id: r.id as string,
        created_at: r.created_at as string,
        actor: (r.actor_id && (names.get(r.actor_id as string) || (r.actor_id as string).slice(0, 8))) || "system",
        action: r.action as string,
        target: (r.target as string | null) ?? null,
        status: r.status as string,
        details: (r.details as string | null) ?? null,
      })),
    };
  });

export const logAdminAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        action: z.string().max(120),
        target: z.string().max(200).optional(),
        details: z.string().max(1000).optional(),
        status: z.enum(["success", "error"]).default("success"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return { ok: false };
    await supabase.from("admin_audit_logs").insert({
      actor_id: userId,
      action: data.action,
      target: data.target ?? null,
      details: data.details ?? null,
      status: data.status,
    });
    return { ok: true };
  });
