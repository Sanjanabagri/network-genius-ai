import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SAMPLE_PROJECTS } from "./onboarding-samples";

export const seedSampleProjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: existing, error: existingError } = await supabase
      .from("saved_projects")
      .select("id")
      .eq("user_id", userId)
      .like("title", "Sample ·%")
      .limit(1);
    if (existingError) throw new Error(existingError.message);
    if (existing && existing.length > 0) return { created: 0 };

    const rows = SAMPLE_PROJECTS.map((s) => ({
      user_id: userId,
      tool: s.tool,
      title: s.title,
      vendor: s.vendor ?? null,
      language: s.language ?? null,
      prompt: s.prompt,
      output: s.output,
      team_id: null,
    }));

    const { error } = await supabase.from("saved_projects").insert(rows);
    if (error) throw new Error(error.message);
    return { created: rows.length };
  });
