import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Copy, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createApiKey, listApiKeys, revokeApiKey } from "@/lib/api-keys.functions";

export const Route = createFileRoute("/_authenticated/settings/api")({
  head: () => ({
    meta: [
      { title: "API & Integrations · NetAssist AI" },
      { name: "description", content: "Create API keys to use NetAssist AI from scripts, Slack, Telegram or any app." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApiPage,
});

function ApiPage() {
  const qc = useQueryClient();
  const list = useServerFn(listApiKeys);
  const create = useServerFn(createApiKey);
  const revoke = useServerFn(revokeApiKey);
  const { data: keys = [], isLoading } = useQuery({ queryKey: ["api-keys"], queryFn: () => list() });
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const endpoint = typeof window !== "undefined" ? `${window.location.origin}/api/public/v1/generate` : "/api/public/v1/generate";

  async function onCreate() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const r = await create({ data: { name } });
      setNewKey(r.key);
      setName("");
      qc.invalidateQueries({ queryKey: ["api-keys"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const curl = `curl -X POST ${endpoint} \\
  -H "Authorization: Bearer ${newKey ?? "na_YOUR_KEY"}" \\
  -H "Content-Type: application/json" \\
  -d '{"tool":"config","vendor":"Cisco IOS-XE","prompt":"OSPF area 0 on Gi0/1"}'`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
      <div>
        <h1 className="text-2xl font-bold">API &amp; Integrations</h1>
        <p className="text-sm text-muted-foreground">Use NetAssist AI from your scripts, Slack/Telegram bots, or any other app with a personal API key.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold">Create a key</h2>
        <div className="flex gap-2">
          <Input placeholder="Key name, e.g. Slack bot" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          <Button onClick={onCreate} disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Create
          </Button>
        </div>
        {newKey && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
            <p className="mb-2 font-medium">Copy this key now — it won't be shown again.</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">{newKey}</code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(newKey); toast.success("Copied"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">Your keys</h2>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : keys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No keys yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {keys.map((k) => (
              <li key={k.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-medium">{k.name} {k.revoked_at && <span className="text-xs text-destructive">(revoked)</span>}</div>
                  <div className="text-xs text-muted-foreground font-mono">{k.key_prefix}… · last used {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : "never"}</div>
                </div>
                {!k.revoked_at && (
                  <Button size="sm" variant="ghost" onClick={async () => { await revoke({ data: { id: k.id } }); qc.invalidateQueries({ queryKey: ["api-keys"] }); toast.success("Key revoked"); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-2">
        <h2 className="font-semibold">How to call it</h2>
        <p className="text-sm text-muted-foreground">Tools: config, troubleshoot, script, mop, rollback, cli, docs, incident, workflow, multi-vendor, troubleshooter, automation-studio, compliance, change-agent. Plan limits apply.</p>
        <pre className="overflow-x-auto rounded-xl bg-muted p-3 text-xs"><code>{curl}</code></pre>
        <p className="text-xs text-muted-foreground">Response: {"{"} "tool": "...", "content": "markdown output" {"}"}</p>
      </section>
    </div>
  );
}
