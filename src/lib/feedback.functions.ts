import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const FEEDBACK_CATEGORIES = [
  "general",
  "bug",
  "feature-request",
  "ai-quality",
  "performance",
  "billing",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export type FeedbackRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  category: string;
  rating: number | null;
  message: string;
  page: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

const SubmitSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES).default("general"),
  rating: z.number().int().min(1).max(5).nullish(),
  message: z.string().trim().min(5, "Please write at least 5 characters").max(4000),
  page: z.string().trim().max(300).nullish(),
});

export const submitFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SubmitSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as { email?: string } | null)?.email ?? null;
    const { data: row, error } = await supabase
      .from("feedback")
      .insert({
        user_id: userId,
        email,
        category: data.category,
        rating: data.rating ?? null,
        message: data.message,
        page: data.page ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as FeedbackRow;
  });

export const listMyFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []) as FeedbackRow[];
  });

export type AdminFeedbackResult = {
  isAdmin: boolean;
  total: number;
  rows: FeedbackRow[];
  stats: { total: number; newCount: number; avgRating: number | null; byCategory: { category: string; count: number }[] };
};

export const listAllFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        status: z.enum(["all", "new", "reviewed", "resolved"]).default("all"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(5).max(100).default(25),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }): Promise<AdminFeedbackResult> => {
    const { supabase, userId } = context;
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    const empty = { total: 0, newCount: 0, avgRating: null, byCategory: [] };
    if (!roleRow) return { isAdmin: false, total: 0, rows: [], stats: empty };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: all, error } = await supabaseAdmin
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    const rows = (all ?? []) as FeedbackRow[];

    const ratings = rows.map((r) => r.rating).filter((r): r is number => typeof r === "number");
    const byCategoryMap = new Map<string, number>();
    for (const r of rows) byCategoryMap.set(r.category, (byCategoryMap.get(r.category) ?? 0) + 1);

    const filtered = data.status === "all" ? rows : rows.filter((r) => r.status === data.status);
    const start = (data.page - 1) * data.pageSize;

    return {
      isAdmin: true,
      total: filtered.length,
      rows: filtered.slice(start, start + data.pageSize),
      stats: {
        total: rows.length,
        newCount: rows.filter((r) => r.status === "new").length,
        avgRating: ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : null,
        byCategory: [...byCategoryMap.entries()]
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count),
      },
    };
  });

export const updateFeedbackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "reviewed", "resolved"]),
        adminNote: z.string().trim().max(2000).nullish(),
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
    if (!roleRow) throw new Error("Not authorized");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("feedback")
      .update({ status: data.status, admin_note: data.adminNote ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
