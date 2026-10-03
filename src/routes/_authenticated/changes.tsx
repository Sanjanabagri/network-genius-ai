import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, Plus, XCircle, Rocket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/changes")({
  head: () => ({ meta: [{ title: "Change Approvals · NetAssist AI" }, { name: "robots", content: "noindex" }] }),
  component: ChangesPage,
});

type HistoryItem = { at: string; by: string; action: string; note?: string };
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-accent/15 text-accent-foreground border-accent/30",
  approved: "bg-primary/15 text-primary border-primary/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  implemented: "bg-muted text-foreground border-border",
};

function ChangesPage() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState({ title: "", description: "", risk: "medium", devices: "", scheduled_for: "", plan: "" });
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null });

  const { data, isLoading } = useQuery({
    queryKey: ["change_requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("change_requests").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const history: HistoryItem[] = [{ at: new Date().toISOString(), by: u.user!.email ?? "", action: "submitted" }];
      const { error } = await supabase.from("change_requests").insert({
        ...form,
        scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
        user_id: u.user!.id,
        history: history as unknown as Json,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Change request submitted"); setOpen(false); setForm({ title: "", description: "", risk: "medium", devices: "", scheduled_for: "", plan: "" }); qc.invalidateQueries({ queryKey: ["change_requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const act = useMutation({
    mutationFn: async ({ id, status, history }: { id: string; status: string; history: HistoryItem[] }) => {
      const { data: u } = await supabase.auth.getUser();
      const note = status === "rejected" ? window.prompt("Reason for rejection?") ?? "" : undefined;
      const next = [...history, { at: new Date().toISOString(), by: u.user!.email ?? "", action: status, note }];
      const { error } = await supabase.from("change_requests").update({ status, history: next as unknown as Json }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Status updated"); qc.invalidateQueries({ queryKey: ["change_requests"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data ?? []).filter((r) => filter === "all" || r.status === filter);
  const count = (s: string) => (data ?? []).filter((r) => r.status === s).length;
  const input = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"><ClipboardCheck className="h-6 w-6" /></div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Change Approvals</h1>
            <p className="mt-1 text-muted-foreground">Submit, review, approve and track every network change with a full audit trail.</p>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><Plus className="h-4 w-4" /> New change</button>
      </div>

      {open && (
        <form onSubmit={(e) => { e.preventDefault(); if (form.title.trim()) create.mutate(); }} className="mt-6 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          <input className={input} placeholder="Title *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={input} placeholder="Devices (e.g. BR2-ACC-01..04)" value={form.devices} onChange={(e) => setForm({ ...form, devices: e.target.value })} />
          <select className={input} value={form.risk} onChange={(e) => setForm({ ...form, risk: e.target.value })}>
            <option value="low">Low risk</option><option value="medium">Medium risk</option><option value="high">High risk</option>
          </select>
          <input type="datetime-local" className={input} value={form.scheduled_for} onChange={(e) => setForm({ ...form, scheduled_for: e.target.value })} />
          <textarea className={`${input} sm:col-span-2`} rows={2} placeholder="Description / business reason" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <textarea className={`${input} font-mono sm:col-span-2`} rows={6} placeholder="Paste the plan (tip: generate it with AI Change Agent)" value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} />
          <button disabled={create.isPending} className="rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:col-span-2">{create.isPending ? "Submitting…" : "Submit for approval"}</button>
        </form>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {["all", "pending", "approved", "rejected", "implemented"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`rounded-full border px-3 py-1 text-xs capitalize ${filter === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
            {s}{s !== "all" ? ` (${count(s)})` : ""}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No change requests here.</p>
        ) : rows.map((r) => {
          const history = (r.history as unknown as HistoryItem[]) ?? [];
          return (
            <details key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <summary className="flex cursor-pointer flex-wrap items-center gap-3">
                <span className="font-semibold">{r.title}</span>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STATUS_STYLE[r.status] ?? ""}`}>{r.status}</span>
                <span className="text-xs uppercase text-muted-foreground">{r.risk} risk</span>
                {r.scheduled_for && <span className="ml-auto text-xs text-muted-foreground">{new Date(r.scheduled_for).toLocaleString()}</span>}
              </summary>
              <div className="mt-4 space-y-3 text-sm">
                {r.description && <p className="text-muted-foreground">{r.description}</p>}
                {r.devices && <p><span className="text-muted-foreground">Devices:</span> <span className="font-mono">{r.devices}</span></p>}
                {r.plan && <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs">{r.plan}</pre>}
                <div className="flex flex-wrap gap-2">
                  {r.status === "pending" && (r.user_id === me ? (
                    <p className="text-xs text-muted-foreground">Waiting for another reviewer — you can't approve your own change.</p>
                  ) : <>
                    <button onClick={() => act.mutate({ id: r.id, status: "approved", history })} className="inline-flex items-center gap-1 rounded-lg border border-primary/40 px-3 py-1.5 text-xs text-primary"><CheckCircle2 className="h-3.5 w-3.5" /> Approve</button>
                    <button onClick={() => act.mutate({ id: r.id, status: "rejected", history })} className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs text-destructive"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                  </>)}
                  {r.status === "approved" && <button onClick={() => act.mutate({ id: r.id, status: "implemented", history })} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs"><Rocket className="h-3.5 w-3.5" /> Mark implemented</button>}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Audit trail</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    {history.map((h, i) => (
                      <li key={i} className="text-muted-foreground"><span className="font-mono">{new Date(h.at).toLocaleString()}</span> — <span className="capitalize text-foreground">{h.action}</span> by {h.by}{h.note ? ` · "${h.note}"` : ""}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </main>
  );
}
