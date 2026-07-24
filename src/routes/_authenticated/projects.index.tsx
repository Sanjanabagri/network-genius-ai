import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient, queryOptions } from "@tanstack/react-query";
import { ArrowLeft, FolderOpen, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listProjects, deleteProject, type SavedProject } from "@/lib/saved-projects.functions";

const projectsQO = (fn: () => Promise<SavedProject[]>) =>
  queryOptions({ queryKey: ["saved_projects"], queryFn: fn });

export const Route = createFileRoute("/_authenticated/projects/")({
  head: () => ({
    meta: [
      { title: "Saved Projects · NetAssist AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const navigate = useNavigate();
  const list = useServerFn(listProjects);
  const del = useServerFn(deleteProject);
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery(projectsQO(() => list()));

  const removeMutation = useMutation({
    mutationFn: async (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Project deleted");
      qc.invalidateQueries({ queryKey: ["saved_projects"] });
    },
    onError: (e: Error) => toast.error("Delete failed", { description: e.message }),
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button
        onClick={() => navigate({ to: "/dashboard" })}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <FolderOpen className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Saved Projects</h1>
          <p className="mt-1 text-muted-foreground">Your full history of saved AI generations.</p>
        </div>
      </div>

      <div className="mt-8">
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {(error as Error).message}
          </div>
        ) : !data || data.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <h3 className="mt-4 font-display text-lg font-semibold">No saved projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Generate something in a tool and hit <span className="font-medium text-foreground">Save as project</span>.
            </p>
            <Link
              to="/dashboard"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elevated"
            >
              Open dashboard
            </Link>
          </div>
        ) : (
          <ul className="grid gap-3">
            {data.map((p) => (
              <li
                key={p.id}
                className="group rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-elevated"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <Link
                    to="/projects/$id"
                    params={{ id: p.id }}
                    className="min-w-0 flex-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                        {p.tool}
                      </span>
                      {p.vendor && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {p.vendor}
                        </span>
                      )}
                      {p.language && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {p.language}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="mt-2 truncate font-display text-base font-semibold">{p.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.prompt}</p>
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${p.title}"?`)) removeMutation.mutate(p.id);
                    }}
                    disabled={removeMutation.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 disabled:opacity-60"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
