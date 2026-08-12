import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { checkIsAdmin } from "@/lib/analytics.functions";

export const Route = createFileRoute("/_admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AdminConsoleLayout,
});

function AdminConsoleLayout() {
  const { user } = Route.useRouteContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);
  const fetchIsAdmin = useServerFn(checkIsAdmin);

  const { data, isLoading } = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: () => fetchIsAdmin({ data: undefined }).catch(() => ({ isAdmin: false })),
    enabled: !signingOut,
    retry: false,
    staleTime: 300000,
  });

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
              <ShieldCheck className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <div className="truncate font-display text-sm font-bold leading-tight">
                NetAssist <span className="text-gradient">Admin Console</span>
              </div>
              <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Back to app</span>
            </Link>
            <ThemeToggle />
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={signingOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{signingOut ? "Signing out…" : "Sign out"}</span>
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying admin access…
        </div>
      ) : data?.isAdmin ? (
        <Outlet />
      ) : (
        <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 font-display text-2xl font-bold">Admin access required</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This console is restricted to administrators. Ask an existing admin to grant your account the admin role.
          </p>
          <Link to="/dashboard" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
            Back to the app
          </Link>
        </div>
      )}
    </div>
  );
}
