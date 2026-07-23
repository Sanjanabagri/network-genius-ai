import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const TOOL_IDS = [
  "config",
  "troubleshoot",
  "script",
  "mop",
  "rollback",
  "cli",
  "docs",
  "incident",
  "workflow",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

const InputSchema = z.object({
  tool: z.enum(TOOL_IDS),
  vendor: z.string().max(80).optional(),
  language: z.string().max(80).optional(),
  prompt: z.string().min(3).max(20000),
});

const SYSTEMS: Record<ToolId, string> = {
  config:
    "You are a senior network engineer. Generate a production-grade device configuration for the requested vendor and use case. Output ONLY the configuration inside a single fenced code block appropriate to the vendor CLI, preceded by a short 2-3 line summary and followed by a short 'Notes' section covering assumptions and prerequisites. Never invent IP addresses; use placeholders if the user did not give them.",
  troubleshoot:
    "You are a principal network troubleshooter. Given the described symptom or CLI evidence, produce: (1) Most likely root cause, (2) Ranked list of alternate causes, (3) Diagnostic commands to confirm (as a fenced block), (4) Remediation steps, (5) Preventive follow-up. Be concise, use markdown headings.",
  script:
    "You are an expert network automation engineer. Produce a complete, runnable automation script in the requested language (Python/Netmiko/Nornir, Ansible playbook, or Terraform). Output the code in a single fenced block. Add a short usage section. Include error handling and idempotency where relevant.",
  mop:
    "You are a change manager. Produce a detailed Method of Procedure (MOP) with sections: Overview, Impact & Risk, Pre-checks, Backout Criteria, Step-by-Step Implementation (numbered, with exact CLI in fenced blocks), Post-checks, Validation, Rollback Reference. Use markdown.",
  rollback:
    "You are a change manager. Given the described change, produce a fully-formed Rollback Plan with sections: Trigger Criteria, Prerequisites, Step-by-Step Rollback Commands (fenced blocks by device), Verification, Notifications, Post-mortem checklist.",
  cli:
    "You are an expert at reading network CLI output (show commands, syslog, packet captures). Analyze the pasted output and produce: Summary, Observed anomalies, Likely causes, Recommended next commands, Recommended actions. Cite exact lines when relevant.",
  docs:
    "You are a network documentation specialist. From the provided configuration or description, produce professional network documentation with: Purpose, Topology summary, Interfaces & IP addressing table (markdown), Routing summary, Security posture, Diagrams-as-code (mermaid) where useful.",
  incident:
    "You are an incident commander. From the notes/timeline provided, produce an executive incident summary: TL;DR, Impact, Timeline (bulleted), Root Cause, Resolution, Action Items (owner, due). Use markdown, be crisp.",
  workflow:
    "You are an automation architect. Design an end-to-end automation workflow for the described goal. Output: Workflow overview, Trigger, Steps (numbered, with tools/APIs per step), Data model, Error handling, Rollout plan. Include a mermaid flowchart.",
};

export const runAiTask = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured.");

    const system = SYSTEMS[data.tool];
    const userMsg = [
      data.vendor ? `Vendor / Platform: ${data.vendor}` : null,
      data.language ? `Language / Framework: ${data.language}` : null,
      "",
      data.prompt,
    ]
      .filter((x) => x !== null)
      .join("\n");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userMsg },
        ],
      }),
    });

    if (res.status === 429) {
      throw new Error("Rate limit reached. Please try again in a moment.");
    }
    if (res.status === 402) {
      throw new Error("AI credits exhausted. Please add credits to your workspace.");
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`AI gateway error (${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content ?? "";
    if (!content) throw new Error("Empty response from AI.");
    return { content };
  });
