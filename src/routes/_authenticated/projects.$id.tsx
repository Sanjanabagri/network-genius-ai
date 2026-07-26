import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Copy, FileDown, Loader2, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getProject, deleteProject, shareProjectWithTeam } from "@/lib/saved-projects.functions";
import { listTeams } from "@/lib/teams.functions";
import { exportAsPdf, exportAsDocx } from "@/lib/export-output";


export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Project · NetAssist AI` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectDetail,
});

function ProjectDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchOne = useServerFn(getProject);
  const del = useServerFn(deleteProject);
  const qc = useQueryClient();
  const [exporting, setExporting] = useState<null | "pdf" | "docx">(null);

  const { data: p, isLoading, error } = useQuery({
    queryKey: ["saved_projects", id],
    queryFn: () => fetchOne({ data: { id } }),
  });

  const removeMutation = useMutation({
    mutationFn: async () => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["saved_projects"] });
      navigate({ to: "/projects" });
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  const teamsFn = useServerFn(listTeams);
  const shareFn = useServerFn(shareProjectWithTeam);
  const teams = useQuery({ queryKey: ["teams"], queryFn: () => teamsFn() });
  const shareMutation = useMutation({
    mutationFn: async (teamId: string | null) => shareFn({ data: { id, teamId } }),
    onSuccess: (_r, teamId) => {
      toast.success(teamId ? "Shared with team" : "Sharing removed");
      qc.invalidateQueries({ queryKey: ["saved_projects"] });
    },
    onError: (e: Error) => toast.error("Could not update sharing", { description: e.message }),
  });


  async function handleExport(kind: "pdf" | "docx") {
    if (!p) return;
    setExporting(kind);
    try {
      if (kind === "pdf") await exportAsPdf(p.title, p.output);
      else await exportAsDocx(p.title, p.output);
      toast.success(`Downloaded ${kind.toUpperCase()}`);
    } catch (e) {
      toast.error("Export failed", { description: (e as Error).message });
    } finally {
      setExporting(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <Link
        to="/projects"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All saved projects
      </Link>

      {isLoading ? (
        <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : error || !p ? (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error)?.message ?? "Project not found"}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                  {p.tool}
                </span>
                {p.vendor && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{p.vendor}</span>}
                {p.language && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{p.language}</span>}
                <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString()}</span>
              </div>
              <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{p.title}</h1>
            </div>
            <button
              onClick={() => { if (confirm("Delete this project?")) removeMutation.mutate(); }}
              disabled={removeMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>

          {(teams.data?.length ?? 0) > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <Users className="h-4 w-4 text-muted-foreground" />
              <label htmlFor="share-team" className="text-sm font-medium">Share with team</label>
              <select
                id="share-team"
                value={p.team_id ?? ""}
                disabled={shareMutation.isPending}
                onChange={(e) => shareMutation.mutate(e.target.value || null)}
                className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              >
                <option value="">Private (only me)</option>
                {teams.data?.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {shareMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          )}



          <section className="mt-6 rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">Prompt</h2>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">{p.prompt}</pre>
          </section>

          <section className="mt-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">Output</h2>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => { navigator.clipboard.writeText(p.output); toast.success("Copied to clipboard"); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={exporting !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-60"
                >
                  {exporting === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF
                </button>
                <button
                  onClick={() => handleExport("docx")}
                  disabled={exporting !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-60"
                >
                  {exporting === "docx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} DOCX
                </button>
              </div>
            </div>
            <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">{p.output}</pre>
          </section>
        </>
      )}
    </main>
  );
}
