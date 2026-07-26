import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Loader2, Mail, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { listTeams, createTeam, listMyInvites, acceptInvite } from "@/lib/teams.functions";

export const Route = createFileRoute("/_authenticated/teams/")({
  head: () => ({
    meta: [
      { title: "Teams · NetAssist AI" },
      { name: "description", content: "Create teams, invite engineers, and share network automation projects." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const teamsFn = useServerFn(listTeams);
  const invitesFn = useServerFn(listMyInvites);
  const createFn = useServerFn(createTeam);
  const acceptFn = useServerFn(acceptInvite);
  const [name, setName] = useState("");

  const teams = useQuery({ queryKey: ["teams"], queryFn: () => teamsFn() });
  const invites = useQuery({ queryKey: ["team_invites_mine"], queryFn: () => invitesFn() });

  const create = useMutation({
    mutationFn: async () => createFn({ data: { name: name.trim() } }),
    onSuccess: (team) => {
      setName("");
      qc.invalidateQueries({ queryKey: ["teams"] });
      toast.success("Team created");
      navigate({ to: "/teams/$id", params: { id: team.id } });
    },
    onError: (e: Error) => toast.error("Could not create team", { description: e.message }),
  });

  const accept = useMutation({
    mutationFn: async (id: string) => acceptFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team_invites_mine"] });
      toast.success("Invite accepted");
    },
    onError: (e: Error) => toast.error("Could not accept invite", { description: e.message }),
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Teams</h1>
          <p className="mt-1 text-muted-foreground">Collaborate with your NOC — shared projects and role-based access.</p>
        </div>
      </div>

      {invites.data && invites.data.length > 0 && (
        <div className="mt-8 rounded-2xl border border-accent/40 bg-accent/10 p-5">
          <h2 className="font-display text-base font-semibold">Pending invites</h2>
          <ul className="mt-3 grid gap-2">
            {invites.data.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <span className="text-sm">
                  <span className="font-semibold">{i.team_name}</span>
                  <span className="text-muted-foreground"> · invited as {i.role}</span>
                </span>
                <button
                  onClick={() => accept.mutate(i.id)}
                  disabled={accept.isPending}
                  className="rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {accept.isPending ? "Joining…" : "Accept"}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim().length >= 2) create.mutate();
        }}
        className="mt-8 flex flex-wrap gap-2 rounded-2xl border border-border bg-card p-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New team name (e.g. Core NOC)"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={create.isPending || name.trim().length < 2}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create team
        </button>
      </form>

      <div className="mt-6">
        {teams.isLoading ? (
          <div className="flex min-h-[160px] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading teams…
          </div>
        ) : teams.error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(teams.error as Error).message}
          </div>
        ) : !teams.data || teams.data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h3 className="mt-4 font-display text-lg font-semibold">No teams yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create one above, then invite teammates by email.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {teams.data.map((t) => (
              <li key={t.id}>
                <Link
                  to="/teams/$id"
                  params={{ id: t.id }}
                  className="block rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate font-display text-lg font-semibold">{t.name}</h3>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                      {t.role}
                    </span>
                  </div>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {t.member_count} member{t.member_count === 1 ? "" : "s"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
