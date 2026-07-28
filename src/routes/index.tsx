import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Network, Shield, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NetAssist AI — Automate. Troubleshoot. Accelerate." },
      { name: "description", content: "The AI copilot for Network, NOC, Security, and SD-WAN engineers. Sign in to start automating." },
      { property: "og:title", content: "NetAssist AI — Automate. Troubleshoot. Accelerate." },
      { property: "og:description", content: "The AI copilot for Network, NOC, Security, and SD-WAN engineers. Sign in to start automating." },
    ],
  }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
      else setChecking(false);
    });
  }, [navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-gradient-hero opacity-40" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-60" />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-up">
          <div className="mx-auto mb-8 grid h-24 w-24 place-items-center rounded-3xl bg-gradient-primary shadow-glow animate-pulse-glow">
            <Network className="h-12 w-12 text-primary-foreground" strokeWidth={2.5} />
          </div>

          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            The AI copilot for network engineers
          </div>

          <h1 className="font-display text-5xl font-bold tracking-tight sm:text-6xl">
            NetAssist <span className="text-gradient">AI</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            Automate. Troubleshoot. Accelerate.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/auth"
              disabled={checking}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-elevated transition-transform hover:-translate-y-0.5 sm:w-auto"
            >
              <Shield className="h-5 w-5" />
              Authenticate
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              to="/home"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card/60 px-8 py-4 text-base font-medium text-foreground backdrop-blur transition-colors hover:bg-muted sm:w-auto"
            >
              Learn more
            </Link>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Sign in or create an account to access your workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
