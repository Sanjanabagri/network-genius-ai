import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus, Server, ShieldCheck, Bot, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/devices")({
  head: () => ({ meta: [{ title: "Device Inventory · NetAssist AI" }, { name: "robots", content: "noindex" }] }),
  component: DevicesPage,
});

const VENDORS = ["Cisco IOS-XE", "Cisco NX-OS", "Juniper Junos", "Arista EOS", "Palo Alto PAN-OS", "Fortinet FortiOS", "Aruba AOS-CX", "Other"];
const empty = { hostname: "", mgmt_ip: "", vendor: VENDORS[0], model: "", site: "", role: "", os_version: "" };

function DevicesPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["devices"],
    queryFn: async () => {
      const { data, error } = await supabase.from("devices").select("*").order("hostname");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("devices").insert({ ...form, user_id: u.user!.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Device added"); setForm(empty); qc.invalidateQueries({ queryKey: ["devices"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("devices").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["devices"] }),
  });

  const rows = (data ?? []).filter((d) => `${d.hostname} ${d.mgmt_ip} ${d.vendor} ${d.site} ${d.role}`.toLowerCase().includes(q.toLowerCase()));
  const field = (k: keyof typeof empty, ph: string) => (
    <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={ph}
      className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow"><Server className="h-6 w-6" /></div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Device Inventory</h1>
          <p className="mt-1 text-muted-foreground">Your network source of truth — feed devices straight into AI tools.</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (form.hostname.trim()) add.mutate(); }}
        className="mt-8 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-4">
        {field("hostname", "Hostname *")}
        {field("mgmt_ip", "Mgmt IP")}
        <select value={form.vendor} onChange={(e) => setForm({ ...form, vendor: e.target.value })} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
          {VENDORS.map((v) => <option key={v}>{v}</option>)}
        </select>
        {field("model", "Model")}
        {field("site", "Site")}
        {field("role", "Role (core, edge, access…)")}
        {field("os_version", "OS version")}
        <button disabled={add.isPending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
          {add.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add device
        </button>
      </form>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search devices…" className="mt-6 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm sm:w-72" />

      <div className="mt-4 overflow-x-auto rounded-2xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center p-10 text-muted-foreground"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…</div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">No devices yet. Add your first device above.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="p-3">Hostname</th><th className="p-3">IP</th><th className="p-3">Vendor</th><th className="p-3">Site</th><th className="p-3">Role</th><th className="p-3">OS</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-border/50 last:border-0">
                  <td className="p-3 font-mono font-medium">{d.hostname}</td>
                  <td className="p-3 font-mono text-muted-foreground">{d.mgmt_ip || "—"}</td>
                  <td className="p-3">{d.vendor}</td>
                  <td className="p-3">{d.site || "—"}</td>
                  <td className="p-3">{d.role || "—"}</td>
                  <td className="p-3 text-muted-foreground">{d.os_version || "—"}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-1">
                      <Link to="/tools/$tool" params={{ tool: "compliance" }} title="Compliance check" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><ShieldCheck className="h-4 w-4" /></Link>
                      <Link to="/tools/$tool" params={{ tool: "change-agent" }} title="Plan a change" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><Bot className="h-4 w-4" /></Link>
                      <button onClick={() => del.mutate(d.id)} title="Delete" className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Live config push/pull to devices requires a secure on-prem connector — coming soon.</p>
    </main>
  );
}
