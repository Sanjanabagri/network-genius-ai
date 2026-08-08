import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronRight, Loader2, Rocket, Sparkles, X } from "lucide-react";
import { seedSampleProjects } from "@/lib/onboarding.functions";

type StepId = "samples" | "tool" | "save" | "team" | "learn";

const STORAGE_KEY = "netassist.onboarding.v1";

type Persisted = { done: StepId[]; dismissed: boolean };

function read(): Persisted {
  if (typeof window === "undefined") return { done: [], dismissed: false };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { done: [], dismissed: false };
    const parsed = JSON.parse(raw) as Persisted;
    return { done: Array.isArray(parsed.done) ? parsed.done : [], dismissed: !!parsed.dismissed };
  } catch {
    return { done: [], dismissed: false };
  }
}

export function OnboardingWalkthrough() {
  const [state, setState] = useState<Persisted>({ done: [], dismissed: true });
  const [hydrated, setHydrated] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const seed = useServerFn(seedSampleProjects);
  const qc = useQueryClient();

  useEffect(() => {
    setState(read());
    setHydrated(true);
  }, []);

  function persist(next: Persisted) {
    setState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  }

  const complete = (id: StepId) =>
    persist({ ...state, done: state.done.includes(id) ? state.done : [...state.done, id] });

  async function loadSamples() {
    setSeeding(true);
    try {
      const res = await seed();
      await qc.invalidateQueries({ queryKey: ["saved_projects"] });
      toast.success(res.created > 0 ? `Added ${res.created} sample projects` : "Sample projects already in your workspace");
      complete("samples");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add sample projects");
    } finally {
      setSeeding(false);
    }
  }

  const steps: {
    id: StepId;
    title: string;
    desc: string;
    action: React.ReactNode;
  }[] = [
    {
      id: "samples",
      title: "Load three sample projects",
      desc: "A switch baseline, an OSPF root-cause analysis and a Netmiko rollout — real outputs you can read right away.",
      action: (
        <button
          onClick={loadSamples}
          disabled={seeding}
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
        >
          {seeding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Add samples
        </button>
      ),
    },
    {
      id: "tool",
      title: "Generate your first configuration",
      desc: "Open the Multi-Vendor Config Generator with a starter prompt and hit generate.",
      action: (
        <Link
          to="/tools/$tool"
          params={{ tool: "multi-vendor" }}
          search={{
            prompt:
              "Configure an IPSec site-to-site VPN between a branch and datacenter with IKEv2, AES-256, PFS group 14 and dead peer detection.",
          }}
          onClick={() => complete("tool")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          Open tool <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      id: "save",
      title: "Review your saved projects",
      desc: "Every generation can be saved with its prompt, vendor and output for a full audit history.",
      action: (
        <Link
          to="/projects"
          onClick={() => complete("save")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          Saved projects <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      id: "team",
      title: "Create a team and invite an engineer",
      desc: "Share configs and MOPs with role-based access: owner, admin, member or viewer.",
      action: (
        <Link
          to="/teams"
          onClick={() => complete("team")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          Teams <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
    {
      id: "learn",
      title: "Follow a guided learning path",
      desc: "Nine hands-on lessons that open the right tool with the prompt pre-loaded.",
      action: (
        <Link
          to="/learn"
          onClick={() => complete("learn")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-muted"
        >
          Learning Center <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      ),
    },
  ];

  const doneCount = steps.filter((s) => state.done.includes(s.id)).length;
  const allDone = doneCount === steps.length;

  if (!hydrated || state.dismissed) return null;

  const current = steps.find((s) => !state.done.includes(s.id));

  return (
    <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6 animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold">
              {allDone ? "You're all set" : "Get started in 5 steps"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {allDone
                ? "Walkthrough complete — dismiss this card whenever you like."
                : "A quick tour of NetAssist AI. Your progress is saved on this device."}
            </p>
          </div>
        </div>
        <button
          onClick={() => persist({ ...state, dismissed: true })}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" /> Dismiss
        </button>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {doneCount} of {steps.length} complete
          </span>
          <span>{Math.round((doneCount / steps.length) * 100)}%</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-gradient-primary transition-all duration-500"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="mt-5 grid gap-2">
        {steps.map((s, i) => {
          const done = state.done.includes(s.id);
          const isCurrent = current?.id === s.id;
          return (
            <li
              key={s.id}
              className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors ${
                isCurrent ? "border-primary/50 bg-primary/5" : "border-border bg-background"
              }`}
            >
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${
                  done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <div className="min-w-[12rem] flex-1">
                <div className={`font-display text-sm font-semibold ${done ? "text-muted-foreground line-through" : ""}`}>
                  {s.title}
                </div>
                <div className="text-xs text-muted-foreground">{s.desc}</div>
              </div>
              <div className="flex items-center gap-2">
                {s.action}
                {!done && s.id !== "samples" && (
                  <button
                    onClick={() => complete(s.id)}
                    className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    Mark done
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
