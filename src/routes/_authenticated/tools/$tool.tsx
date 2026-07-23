import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  Activity, ArrowLeft, Bot, Boxes, Copy, FileCode2, FileDown, FileText, GitBranch,
  Loader2, MessagesSquare, Sparkles, Terminal, Wand2, Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { runAiTask, type ToolId } from "@/lib/ai.functions";
import { exportAsPdf, exportAsDocx } from "@/lib/export-output";

type ToolDef = {
  id: ToolId;
  title: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  vendors?: string[];
  languages?: string[];
  placeholder: string;
  example: string;
};

const TOOLS: Record<ToolId, ToolDef> = {
  config: {
    id: "config",
    title: "AI Config Generator",
    tagline: "Generate vendor-aware device configurations from plain English.",
    icon: Wand2,
    vendors: ["Cisco IOS-XE", "Cisco NX-OS", "Cisco IOS-XR", "Arista EOS", "Juniper Junos", "Palo Alto PAN-OS", "Fortinet FortiOS", "Cisco Viptela SD-WAN", "Versa SD-WAN"],
    placeholder: "Describe the configuration you need…",
    example: "Configure OSPF area 0 on Gi0/0 and Gi0/1, redistribute connected, and enable BFD.",
  },
  troubleshoot: {
    id: "troubleshoot",
    title: "CLI Troubleshooter",
    tagline: "Root-cause analysis from symptoms and show output.",
    icon: Terminal,
    placeholder: "Paste symptoms and any CLI evidence…",
    example: "BGP neighbor 10.0.0.2 flapping every 3 minutes. show bgp summary shows Idle (Admin) → Active.",
  },
  script: {
    id: "script",
    title: "Automation Script Generator",
    tagline: "Python (Netmiko/Nornir), Ansible, or Terraform in seconds.",
    icon: FileCode2,
    languages: ["Python (Netmiko)", "Python (Nornir)", "Ansible", "Terraform", "Bash"],
    placeholder: "Describe what the script should automate…",
    example: "Backup running-config from a list of Cisco IOS devices to timestamped files.",
  },
  mop: {
    id: "mop",
    title: "MOP / Change Request",
    tagline: "Full Method of Procedure with pre-checks, steps, validation, rollback.",
    icon: GitBranch,
    placeholder: "Describe the change (what, where, when)…",
    example: "Upgrade Cisco Catalyst 9300 stack from 17.09.4a to 17.12.4 during a 2-hour maintenance window.",
  },
  rollback: {
    id: "rollback",
    title: "Rollback Plan Generator",
    tagline: "Step-by-step rollback with triggers, commands, and verification.",
    icon: GitBranch,
    placeholder: "Describe the change you need to be able to roll back…",
    example: "New OSPF adjacency and route redistribution between core and DMZ VRF.",
  },
  cli: {
    id: "cli",
    title: "CLI Output Analyzer",
    tagline: "Paste show output, syslog, or debug — get an expert read.",
    icon: Activity,
    placeholder: "Paste CLI or log output here…",
    example: "%LINK-3-UPDOWN: Interface GigabitEthernet0/1, changed state to down\n%LINEPROTO-5-UPDOWN: Line protocol on Interface Gi0/1, changed state to down",
  },
  docs: {
    id: "docs",
    title: "Network Documentation",
    tagline: "Turn configs into professional docs with tables and diagrams.",
    icon: FileText,
    placeholder: "Paste a configuration or describe the network…",
    example: "Site: DC-East. Core: 2x Nexus 9336. Edge: 2x ASR1001-X. Firewalls: PA-3260 HA pair. VLANs 10/20/30.",
  },
  incident: {
    id: "incident",
    title: "AI Incident Summary",
    tagline: "Executive-ready incident write-up from notes or timeline.",
    icon: MessagesSquare,
    placeholder: "Paste notes, chat log, or a timeline…",
    example: "13:04 alerts on WAN circuit down. 13:06 confirmed BGP down. 13:22 provider ack. 14:01 restored via BFD reroute.",
  },
  workflow: {
    id: "workflow",
    title: "Automation Workflow Designer",
    tagline: "End-to-end workflows: triggers, steps, error handling, rollout.",
    icon: Workflow,
    placeholder: "Describe the outcome you want to automate…",
    example: "Auto-remediate high CPU alerts on Cisco switches by collecting show tech and opening a Jira ticket.",
  },
};

export const TOOL_LIST: ToolDef[] = Object.values(TOOLS);

export const Route = createFileRoute("/_authenticated/tools/$tool")({
  head: ({ params }) => {
    const t = TOOLS[params.tool as ToolId];
    return {
      meta: [
        { title: `${t?.title ?? "Tool"} · NetAssist AI` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  loader: ({ params }) => {
    if (!(params.tool in TOOLS)) throw notFound();
    return { tool: TOOLS[params.tool as ToolId] };
  },
  notFoundComponent: () => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-display text-3xl font-bold">Tool not found</h1>
      <Link to="/dashboard" className="mt-6 inline-flex items-center gap-2 text-primary underline">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>
    </main>
  ),
  errorComponent: ({ error, reset }) => (
    <main className="mx-auto max-w-3xl px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="mt-6 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
        Try again
      </button>
    </main>
  ),
  component: ToolPage,
});

function ToolPage() {
  const { tool } = Route.useLoaderData();
  const navigate = useNavigate();
  const run = useServerFn(runAiTask);
  const [vendor, setVendor] = useState(tool.vendors?.[0] ?? "");
  const [language, setLanguage] = useState(tool.languages?.[0] ?? "");
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [exporting, setExporting] = useState<null | "pdf" | "docx">(null);

  async function handleExport(kind: "pdf" | "docx") {
    if (!output) return;
    setExporting(kind);
    try {
      if (kind === "pdf") await exportAsPdf(tool.title, output);
      else await exportAsDocx(tool.title, output);
      toast.success(`Downloaded ${kind.toUpperCase()}`);
    } catch (e) {
      toast.error(`Export failed`, { description: (e as Error).message });
    } finally {
      setExporting(null);
    }
  }


  const mutation = useMutation({
    mutationFn: async () => {
      const r = await run({
        data: {
          tool: tool.id,
          vendor: tool.vendors ? vendor : undefined,
          language: tool.languages ? language : undefined,
          prompt,
        },
      });
      return r.content;
    },
    onSuccess: (content) => setOutput(content),
    onError: (e: Error) => toast.error("AI request failed", { description: e.message }),
  });

  const Icon = tool.icon;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <button
        onClick={() => navigate({ to: "/dashboard" })}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <div className="flex flex-wrap items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{tool.title}</h1>
          <p className="mt-1 text-muted-foreground">{tool.tagline}</p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Input
          </h2>

          {tool.vendors && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Vendor / Platform</label>
              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {tool.vendors.map((v: string) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}

          {tool.languages && (
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Language / Framework</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              >
                {tool.languages.map((v: string) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          )}

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-xs font-medium text-muted-foreground">Describe your request</label>
              <button
                type="button"
                onClick={() => setPrompt(tool.example)}
                className="text-xs text-primary hover:underline"
              >
                Try an example
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={tool.placeholder}
              rows={10}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </div>

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || prompt.trim().length < 3}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:-translate-y-0.5 disabled:opacity-60"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {mutation.isPending ? "Generating…" : "Generate with AI"}
          </button>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">Output</h2>
            {output && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(output);
                    toast.success("Copied to clipboard");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  disabled={exporting !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-60"
                >
                  {exporting === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  {exporting === "pdf" ? "Exporting…" : "PDF"}
                </button>
                <button
                  onClick={() => handleExport("docx")}
                  disabled={exporting !== null}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted disabled:opacity-60"
                >
                  {exporting === "docx" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
                  {exporting === "docx" ? "Exporting…" : "DOCX"}
                </button>
              </div>
            )}
          </div>

          <div className="mt-4 min-h-[400px] rounded-xl border border-dashed border-border bg-background/50 p-4">
            {mutation.isPending ? (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm">The AI is thinking…</p>
              </div>
            ) : output ? (
              <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-foreground">
                {output}
              </pre>
            ) : (
              <div className="flex h-full min-h-[380px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <Bot className="h-8 w-8 text-primary/60" />
                <p className="max-w-xs text-sm">Your AI-generated result will appear here. Describe your request and click Generate.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="mt-10">
        <h3 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">Other modules</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOOL_LIST.filter((t) => t.id !== tool.id).slice(0, 4).map((t) => {
            const I = t.icon;
            return (
              <Link
                key={t.id}
                to="/tools/$tool"
                params={{ tool: t.id }}
                className="group rounded-xl border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="inline-grid h-8 w-8 place-items-center rounded-lg bg-primary/15 text-primary">
                  <I className="h-4 w-4" />
                </div>
                <div className="mt-2 text-sm font-semibold">{t.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{t.tagline}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

// Re-export for dashboard usage
export { TOOLS };
