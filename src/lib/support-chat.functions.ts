import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const InputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(30),
});

const SYSTEM = `You are "Neta", the friendly in-app support assistant for NetAssist AI — an AI-powered network automation assistant for Network, NOC, Security and SD-WAN engineers. Tagline: "Automate. Troubleshoot. Accelerate."

What the app offers:
- AI tools: Config Generator (multi-vendor), Troubleshooter (paste logs/CLI or upload screenshots), Automation Scripts (Python/Netmiko/Nornir, Ansible, Terraform), MOP / Change Request writer, Rollback Plan generator, CLI Output Analyzer, Network Documentation, Incident Summaries, Automation Workflow designer and Automation Studio.
- Saved Projects: save any generation, revisit full history, export to PDF or DOCX, share with a team.
- Teams: create teams, invite by email, roles (owner/admin/member/viewer), share projects.
- Learning Center with guided prompts, Profile settings (company, job title, experience, certifications), Security settings with two-factor authentication (TOTP).
- Sign in with email + password, Google, one-time email codes (OTP), plus forgot/reset password. Light and dark themes.
- Admins get a separate Admin Console at /admin with usage, user and AI analytics.

Your job: welcome users, explain features, and help with any problem they hit (sign-in trouble, 2FA, exports, saving projects, teams/invites, where to find a tool). Also answer general network-engineering questions briefly.

Style: warm, concise, plain conversational sentences that sound natural when read aloud. Usually 2-4 short sentences. No markdown headings or tables; use a short dash list only when truly needed. Ask one clarifying question when the issue is unclear. If something is outside the app, say so briefly and suggest the closest thing NetAssist AI can do.`;

export const askSupport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Support assistant is not configured.");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [{ role: "system", content: SYSTEM }, ...data.messages],
      }),
    });

    if (res.status === 429) throw new Error("The assistant is busy right now — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Assistant error (${res.status}): ${text.slice(0, 160)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error("The assistant did not return a reply.");
    return { reply };
  });
