import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TOOL_IDS = [
  "config", "troubleshoot", "script", "mop", "rollback", "cli", "docs", "incident", "workflow",
  "multi-vendor", "troubleshooter", "automation-studio",
] as const;

export type SavedProject = {
  id: string;
  user_id: string;
  tool: (typeof TOOL_IDS)[number];
  title: string;
  vendor: string | null;
  language: string | null;
  prompt: string;
  output: string;
  team_id: string | null;
  created_at: string;
  updated_at: string;
};

const SaveSchema = z.object({
  tool: z.enum(TOOL_IDS),
  title: z.string().min(1).max(200),
  vendor: z.string().max(120).nullish(),
  language: z.string().max(120).nullish(),
  prompt: z.string().min(1).max(20000),
  output: z.string().min(1).max(200000),
  teamId: z.string().uuid().nullish(),
});


export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SaveSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("saved_projects")
      .insert({
        user_id: userId,
        tool: data.tool,
        title: data.title,
        vendor: data.vendor ?? null,
        language: data.language ?? null,
        prompt: data.prompt,
        output: data.output,
        team_id: data.teamId ?? null,
      })

      .select()
      .single();
    if (error) throw new Error(error.message);
    return row as SavedProject;
  });

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("saved_projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as SavedProject[];
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("saved_projects")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Project not found");
    return row as SavedProject;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("saved_projects")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
