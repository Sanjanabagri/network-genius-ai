import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import {
  getTeam,
  inviteToTeam,
  cancelInvite,
  updateMemberRole,
  removeMember,
  type TeamRole,
} from "@/lib/teams.functions";

export const Route = createFileRoute("/_authenticated/teams/$id")({
  head: () => ({
    meta: [
      { title: "Team · NetAssist AI" },
      { name: "description", content: "Manage team members, roles and invites for your network engineering team." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamDetail,
});

const ROLES: TeamRole[] = ["admin", "member", "viewer"];

function TeamDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const getFn = useServerFn(getTeam);
  const inviteFn = useServerFn(inviteToTeam);
  const cancelFn = useServerFn(cancelInvite);
  const roleFn = useServerFn(updateMemberRole);
  const removeFn = useServerFn(removeMember);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("member");

  const q = useQuery({ queryKey: ["team", id], queryFn: () => getFn({ data: { id } }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["team", id] });

  const invite = useMutation({
    mutationFn: async () => inviteFn({ data: { teamId: id, email: email.trim(), role: role as "admin" | "member" | "viewer" } }),
    onSuccess: () => {
      setEmail("");
      refresh();
      toast.success("Invite sent", { description: "They'll see it on their Teams page after signing in." });
    },
    onError: (e: Error) => toast.error("Invite failed", { description: e.message }),
  });

  const cancel = useMutation({
    mutationFn: async (inviteId: string) => cancelFn({ data: { id: inviteId } }),
    onSuccess: () => { refresh(); toast.success("Invite cancelled"); },
    onError: (e: Error) => toast.error("Failed", { description: e.message }),
  });

  const changeRole = useMutation({
    mutationFn: async (v: { memberId: string; role: TeamRole }) => roleFn({ data: v }),
    onSuccess: () => { refresh(); toast.success("Role updated"); },
    onError: (e: Error) => toast.error("Failed", { description: e.message }),
  });

  const kick = useMutation({
    mutationFn: async (memberId: string) => removeFn({ data: { memberId } }),
    onSuccess: () => { refresh(); toast.success("Member removed"); },
    onError: (e: Error) => toast.error("Failed", { description: e.message }),
  });

  if (q.isLoading) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-5xl items-center justify-center px-4 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading team…
      </main>
    );
  }
  if (q.error || !q.data) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(q.error as Error)?.message ?? "Team not found"}
        </div>
      </main>
    );
  }

  const { team, members, invites, myRole, myUserId } = q.data;
  const canManage = myRole === "owner" || myRole === "admin";

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/teams" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All teams
      </Link>

      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">{team.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You are <span className="font-semibold text-foreground">{myRole}</span> · {members.length} member{members.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {canManage && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (email.includes("@")) invite.mutate(); }}
          className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4"
        >
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="engineer@company.com"
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
            className="rounded-xl border border-border bg-background px-3 py-2 text-sm"
            aria-label="Invite role"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button
            type="submit"
            disabled={invite.isPending || !email.includes("@")}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {invite.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Invite
          </button>
        </form>
      )}

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold">Members</h2>
        <ul className="mt-3 grid gap-2">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {m.full_name ?? "Team member"} {m.user_id === myUserId && <span className="text-muted-foreground">(you)</span>}
                </div>
                <div className="text-xs text-muted-foreground">{m.job_title ?? "Network engineer"}</div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && m.role !== "owner" ? (
                  <select
                    value={m.role}
                    onChange={(e) => changeRole.mutate({ memberId: m.id, role: e.target.value as TeamRole })}
                    className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                    aria-label={`Role for ${m.full_name ?? "member"}`}
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                ) : (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                    {m.role}
                  </span>
                )}
                {(canManage || m.user_id === myUserId) && m.role !== "owner" && (
                  <button
                    onClick={() => { if (confirm("Remove this member?")) kick.mutate(m.id); }}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                    aria-label="Remove member"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold">Pending invites</h2>
          {invites.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {invites.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border bg-card px-4 py-3">
                  <span className="text-sm">{i.email} <span className="text-muted-foreground">· {i.role}</span></span>
                  <button
                    onClick={() => cancel.mutate(i.id)}
                    className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
