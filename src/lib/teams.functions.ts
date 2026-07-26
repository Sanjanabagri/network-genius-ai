import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type TeamRole = "owner" | "admin" | "member" | "viewer";

export type Team = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type TeamSummary = Team & { role: TeamRole; member_count: number };

export type TeamMember = {
  id: string;
  user_id: string;
  role: TeamRole;
  created_at: string;
  full_name: string | null;
  job_title: string | null;
};

export type TeamInvite = {
  id: string;
  team_id: string;
  email: string;
  role: TeamRole;
  accepted_at: string | null;
  created_at: string;
};

const RoleSchema = z.enum(["owner", "admin", "member", "viewer"]);
const IdSchema = z.object({ id: z.string().uuid() });

export const listTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: memberships, error } = await supabase
      .from("team_members")
      .select("team_id, role")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const ids = (memberships ?? []).map((m) => m.team_id);
    if (ids.length === 0) return [] as TeamSummary[];

    const [{ data: teams, error: te }, { data: allMembers }] = await Promise.all([
      supabase.from("teams").select("*").in("id", ids),
      supabase.from("team_members").select("team_id").in("team_id", ids),
    ]);
    if (te) throw new Error(te.message);

    return (teams ?? [])
      .map((t) => ({
        ...(t as Team),
        role: (memberships ?? []).find((m) => m.team_id === t.id)?.role as TeamRole,
        member_count: (allMembers ?? []).filter((m) => m.team_id === t.id).length,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)) as TeamSummary[];
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(2).max(80) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: team, error } = await supabase
      .from("teams")
      .insert({ name: data.name, created_by: userId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const { error: me } = await supabase
      .from("team_members")
      .insert({ team_id: team.id, user_id: userId, role: "owner" });
    if (me) throw new Error(me.message);
    return team as Team;
  });

export const renameTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), name: z.string().min(2).max(80) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("teams")
      .update({ name: data.name })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: team, error } = await supabase
      .from("teams")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!team) throw new Error("Team not found");

    const { data: members, error: me } = await supabase
      .from("team_members")
      .select("id, user_id, role, created_at")
      .eq("team_id", data.id)
      .order("created_at", { ascending: true });
    if (me) throw new Error(me.message);

    const userIds = (members ?? []).map((m) => m.user_id);
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, job_title").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null; job_title: string | null }[] };

    const { data: invites } = await supabase
      .from("team_invites")
      .select("*")
      .eq("team_id", data.id)
      .is("accepted_at", null)
      .order("created_at", { ascending: false });

    const myRole = (members ?? []).find((m) => m.user_id === userId)?.role as TeamRole | undefined;

    return {
      team: team as Team,
      myRole: myRole ?? "viewer",
      myUserId: userId,
      members: (members ?? []).map((m) => {
        const p = (profiles ?? []).find((x) => x.id === m.user_id);
        return {
          ...m,
          role: m.role as TeamRole,
          full_name: p?.full_name ?? null,
          job_title: p?.job_title ?? null,
        };
      }) as TeamMember[],
      invites: (invites ?? []) as TeamInvite[],
    };
  });

export const inviteToTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        teamId: z.string().uuid(),
        email: z.string().email().max(200),
        role: RoleSchema.exclude(["owner"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("team_invites").upsert(
      {
        team_id: data.teamId,
        email: data.email.toLowerCase(),
        role: data.role,
        invited_by: userId,
        accepted_at: null,
      },
      { onConflict: "team_id,email" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("team_invites").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listMyInvites = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims as { email?: string })?.email?.toLowerCase();
    if (!email) return [] as (TeamInvite & { team_name: string })[];
    const { data, error } = await context.supabase
      .from("team_invites")
      .select("*")
      .eq("email", email)
      .is("accepted_at", null);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as TeamInvite[];
    if (rows.length === 0) return [] as (TeamInvite & { team_name: string })[];
    const { data: teams } = await context.supabase
      .from("teams")
      .select("id, name")
      .in("id", rows.map((r) => r.team_id));
    return rows.map((r) => ({
      ...r,
      team_name: (teams ?? []).find((t) => t.id === r.team_id)?.name ?? "Team",
    }));
  });

export const acceptInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => IdSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const email = (context.claims as { email?: string })?.email?.toLowerCase();
    const { data: invite, error } = await supabase
      .from("team_invites")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite || invite.email.toLowerCase() !== email) throw new Error("Invite not found");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: ie } = await supabaseAdmin
      .from("team_members")
      .upsert(
        { team_id: invite.team_id, user_id: userId, role: invite.role },
        { onConflict: "team_id,user_id" },
      );
    if (ie) throw new Error(ie.message);
    await supabaseAdmin
      .from("team_invites")
      .update({ accepted_at: new Date().toISOString() })
      .eq("id", invite.id);
    return { teamId: invite.team_id as string };
  });

export const updateMemberRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ memberId: z.string().uuid(), role: RoleSchema }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_members")
      .update({ role: data.role })
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ memberId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("team_members")
      .delete()
      .eq("id", data.memberId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
