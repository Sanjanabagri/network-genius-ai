import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { planOf, type PlanTier } from "@/lib/plans";

function startOfTodayIso() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export const getMyBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: sub }, aiCount, projCount] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("plan, status, seats, current_period_end")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("ai_requests")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "success")
        .gte("created_at", startOfTodayIso()),
      supabase
        .from("saved_projects")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId),
    ]);

    const plan = (sub?.plan ?? "free") as PlanTier;
    const def = planOf(plan);

    return {
      plan,
      status: sub?.status ?? "active",
      seats: sub?.seats ?? 1,
      currentPeriodEnd: sub?.current_period_end ?? null,
      usage: {
        aiToday: aiCount.count ?? 0,
        aiLimit: def.dailyAiLimit,
        projects: projCount.count ?? 0,
        projectLimit: def.projectLimit,
      },
    };
  });
