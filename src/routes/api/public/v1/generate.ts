import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { TOOL_IDS, SYSTEMS } from "@/lib/ai.functions";
import { planOf } from "@/lib/plans";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const Body = z.object({
  tool: z.enum(TOOL_IDS),
  prompt: z.string().min(3).max(20000),
  vendor: z.string().max(80).optional(),
  language: z.string().max(80).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/public/v1/generate")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
        if (!key.startsWith("na_")) return json({ error: "Missing or invalid API key" }, 401);

        let body: z.infer<typeof Body>;
        try {
          body = Body.parse(await request.json());
        } catch {
          return json({ error: "Invalid body. Required: tool, prompt" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: keyRow } = await supabaseAdmin
          .from("api_keys")
          .select("id,user_id,revoked_at")
          .eq("key_hash", await sha256Hex(key))
          .maybeSingle();
        if (!keyRow || keyRow.revoked_at) return json({ error: "Invalid or revoked API key" }, 401);

        const userId = keyRow.user_id;
        const { data: sub } = await supabaseAdmin
          .from("subscriptions").select("plan").eq("user_id", userId).maybeSingle();
        const limit = planOf(sub?.plan).dailyAiLimit;
        if (limit !== null) {
          const since = new Date();
          since.setUTCHours(0, 0, 0, 0);
          const { count } = await supabaseAdmin
            .from("ai_requests").select("id", { count: "exact", head: true })
            .eq("user_id", userId).eq("status", "success").gte("created_at", since.toISOString());
          if ((count ?? 0) >= limit) return json({ error: `Daily limit of ${limit} reached. Upgrade to Pro.` }, 429);
        }

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return json({ error: "AI not configured" }, 500);

        const started = Date.now();
        const header = [
          body.vendor ? `Vendor / Platform: ${body.vendor}` : null,
          body.language ? `Language / Framework: ${body.language}` : null,
        ].filter(Boolean).join("\n");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "Lovable-API-Key": apiKey,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-6-astra",
            instructions: SYSTEMS[body.tool],
            input: [header, body.prompt].filter(Boolean).join("\n\n"),
            reasoning: { effort: "low" },
            store: false,
            stream: true,
          }),
        });

        const log = (status: "success" | "error", error?: string) =>
          supabaseAdmin.from("ai_requests").insert({
            user_id: userId, tool: body.tool, vendor: body.vendor ?? null, language: body.language ?? null,
            status, error_message: error?.slice(0, 500) ?? null, duration_ms: Date.now() - started,
          });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          await log("error", `gateway ${res.status}: ${text}`);
          const status = [402, 403, 429].includes(res.status) ? res.status : 502;
          return json({ error: `AI error (${res.status})` }, status);
        }

        // Consume SSE stream server-side, return final text.
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let out = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf("\n")) >= 0) {
            const line = buf.slice(0, i).trim();
            buf = buf.slice(i + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const ev = JSON.parse(payload) as { type?: string; delta?: string };
              if (ev.type === "response.output_text.delta" && ev.delta) out += ev.delta;
            } catch { /* ignore partial */ }
          }
        }

        if (!out) {
          await log("error", "empty response");
          return json({ error: "Empty AI response" }, 502);
        }
        await log("success");
        await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", keyRow.id);
        return json({ tool: body.tool, content: out });
      },
    },
  },
});
