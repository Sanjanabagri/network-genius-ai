import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { GripVertical, Loader2, Play, Plus, Save, Trash2, Workflow as WorkflowIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/workflows")({
  head: () => ({ meta: [{ title: "Workflow Builder · NetAssist AI" }, { name: "robots", content: "noindex" }] }),
  component: WorkflowsPage,
});

type Step = { id: string; type: string; label: string; detail: string };
const STEP_TYPES: { type: string; label: string; tool?: string }[] = [
  { type: "precheck", label: "Pre-check", tool: "cli" },
  { type: "backup", label: "Backup config", tool: "automation-studio" },
  { type: "compliance", label: "Compliance check", tool: "compliance" },
  { type: "config", label: "Generate config", tool: "multi-vendor" },
  { type: "approval", label: "Approval gate" },
  { type: "push", label: "Push config", tool: "automation-studio" },
  { type: "verify", label: "Verify", tool: "cli" },
  { type: "rollback", label: "Rollback on failure", tool: "rollback" },
  { type: "notify", label: "Notify team" },
];
const toolFor = (t: string) => STEP_TYPES.find((s) => s.type === t)?.tool;
const uid = () => Math.random().toString(36).slice(2, 10);

function WorkflowsPage() {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("New workflow");
  const [steps, setSteps] = useState<Step[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const { data, error } = await supabase.from("workflows").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { name, steps: steps as unknown as Json };
      if (editingId) {
        const { error } = await supabase.from("workflows").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: u } = await supabase.auth.getUser();
        const { data: row, error } = await supabase.from("workflows").insert({ ...payload, user_id: u.user!.id }).select("id").single();
        if (error) throw error;
        setEditingId(row.id);
      }
    },
    onSuccess: () => { toast.success("Workflow saved"); qc.invalidateQueries({ queryKey: ["workflows"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("workflows").delete().eq("id", id); if (error) throw error; },
    onSuccess: (_d, id) => { if (id === editingId) reset(); qc.invalidateQueries({ queryKey: ["workflows"] }); },
  });

  function reset() { setEditingId(null); setName("New workflow"); setSteps([]); }
  function addStep(type: string) {
    const def = STEP_TYPES.find((s) => s.type === type)!;
    setSteps((s) => [...s, { id: uid(), type, label: def.label, detail: "" }]);
  }
  function onDrop(i: number) {
    if (dragIdx === null || dragIdx === i) return;
    setSteps((s) => { const n = [...s]; const [m] = n.splice(dragIdx, 1); n.splice(i, 0, m); return n; });
    setDragIdx(null);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"><WorkflowIcon className="h-6 w-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Workflow Builder</h1>
          <p className="mt-1 text-muted-foreground">Drag-and-drop automation flows. Each step can launch the matching AI tool.</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr_240px]">
        <aside className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Step library</p>
          <div className="space-y-1.5">
            {STEP_TYPES.map((s) => (
              <button key={s.type} onClick={() => addStep(s.type)} className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-sm hover:border-primary/50">
                <Plus className="h-3.5 w-3.5 text-primary" /> {s.label}
              </button>
            ))}
          </div>
        </aside>

        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold" />
            <button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()} className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
            </button>
            <button onClick={reset} className="rounded-lg border border-border px-3 py-2 text-sm">New</button>
          </div>

          <ol className="mt-4 space-y-2">
            {steps.length === 0 && <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Add steps from the library to build your flow.</p>}
            {steps.map((s, i) => {
              const tool = toolFor(s.type);
              return (
                <li key={s.id} draggable onDragStart={() => setDragIdx(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(i)}
                  className={`flex items-start gap-2 rounded-xl border bg-background p-3 ${dragIdx === i ? "border-primary" : "border-border"}`}>
                  <GripVertical className="mt-2 h-4 w-4 cursor-grab text-muted-foreground" />
                  <span className="mt-1.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
                  <div className="flex-1 space-y-1.5">
                    <input value={s.label} onChange={(e) => setSteps((all) => all.map((x) => x.id === s.id ? { ...x, label: e.target.value } : x))} className="w-full bg-transparent text-sm font-semibold outline-none" />
                    <input value={s.detail} placeholder="Details (devices, commands, conditions…)" onChange={(e) => setSteps((all) => all.map((x) => x.id === s.id ? { ...x, detail: e.target.value } : x))} className="w-full rounded-md border border-border bg-card px-2 py-1 text-xs" />
                  </div>
                  {tool && <Link to="/tools/$tool" params={{ tool }} title="Run with AI" className="rounded-md p-1.5 text-primary hover:bg-primary/10"><Play className="h-4 w-4" /></Link>}
                  <button onClick={() => setSteps((all) => all.filter((x) => x.id !== s.id))} className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Saved workflows</p>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">None yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {(data ?? []).map((w) => (
                <li key={w.id} className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 text-sm ${w.id === editingId ? "border-primary" : "border-border"}`}>
                  <button className="flex-1 truncate text-left" onClick={() => { setEditingId(w.id); setName(w.name); setSteps((w.steps as unknown as Step[]) ?? []); }}>{w.name}</button>
                  <button onClick={() => remove.mutate(w.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
