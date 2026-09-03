import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import {
  BarChart3,
  ChevronDown,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  MessageSquareHeart,
  Network,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CommandPalette } from "@/components/CommandPalette";
import { useActivityTracking } from "@/hooks/use-activity-tracking";
import { checkIsAdmin } from "@/lib/analytics.functions";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  useActivityTracking();
  const fetchIsAdmin = useServerFn(checkIsAdmin);
  const { data: adminData } = useQuery({
    queryKey: ["is-admin", user.id],
    // The session can disappear mid-flight (sign-out); never let a 401 bubble up.
    queryFn: () =>
      fetchIsAdmin({ data: undefined }).catch(() => ({ isAdmin: false })),
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

  const displayName = user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Account";
  const initials = displayName
    .split(" ")
    .map((part: string) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const menuLinkClass = "flex w-full items-center gap-2";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
              <Network className="h-4 w-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display text-base font-bold">
              NetAssist <span className="text-gradient">AI</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
          <CommandPalette />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-auto gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2 text-sm font-medium hover:bg-muted sm:pr-3"
                aria-label="Open account menu"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                  {initials}
                </span>
                <span className="hidden max-w-44 truncate sm:inline">{user.email}</span>
                <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-64">
              <DropdownMenuLabel className="px-3 py-2">
                <div className="truncate text-sm font-semibold text-foreground">{displayName}</div>
                <div className="mt-0.5 truncate text-xs font-normal text-muted-foreground">{user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/dashboard" className={menuLinkClass}>
                  <LayoutDashboard className="text-muted-foreground" /> Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/profile" className={menuLinkClass}>
                  <Settings className="text-muted-foreground" /> View profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings/security" className={menuLinkClass}>
                  <Shield className="text-muted-foreground" /> Security &amp; 2FA
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/projects" className={menuLinkClass}>
                  <FolderOpen className="text-muted-foreground" /> Saved projects
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/teams" className={menuLinkClass}>
                  <Users className="text-muted-foreground" /> Teams
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/learn" className={menuLinkClass}>
                  <GraduationCap className="text-muted-foreground" /> Learning Center
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/feedback" className={menuLinkClass}>
                  <MessageSquareHeart className="text-muted-foreground" /> Send feedback
                </Link>
              </DropdownMenuItem>
              {adminData?.isAdmin ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className={menuLinkClass}>
                      <BarChart3 className="text-muted-foreground" /> Admin panel
                    </Link>
                  </DropdownMenuItem>
                </>
              ) : null}
              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => void signOut()}
                disabled={signingOut}
                className="text-destructive focus:text-destructive"
              >
                <LogOut /> {signingOut ? "Signing out…" : "Sign out"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}
