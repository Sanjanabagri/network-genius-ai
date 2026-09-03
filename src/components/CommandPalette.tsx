import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  FileCode2,
  FileText,
  FolderOpen,
  GitBranch,
  GraduationCap,
  LayoutDashboard,
  Layers,
  MessageSquareHeart,
  MessagesSquare,
  Search,
  Settings,
  Shield,
  Terminal,
  Users,
  Wand2,
  Workflow,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { listProjects } from "@/lib/saved-projects.functions";
import type { ToolId } from "@/lib/ai.functions";

const TOOLS: { id: ToolId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "multi-vendor", label: "Multi-Vendor Config Generator", icon: Layers },
  { id: "troubleshooter", label: "AI Network Troubleshooter", icon: Search },
  { id: "automation-studio", label: "Automation Studio", icon: FileCode2 },
  { id: "config", label: "AI Config Generator", icon: Wand2 },
  { id: "troubleshoot", label: "CLI Troubleshooter", icon: Terminal },
  { id: "script", label: "Automation Scripts", icon: FileCode2 },
  { id: "mop", label: "MOP / Change Request", icon: GitBranch },
  { id: "rollback", label: "Rollback Plan", icon: GitBranch },
  { id: "cli", label: "CLI Output Analyzer", icon: Activity },
  { id: "docs", label: "Network Documentation", icon: FileText },
  { id: "incident", label: "Incident Summary", icon: MessagesSquare },
  { id: "workflow", label: "Workflow Designer", icon: Workflow },
];

const PAGES = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Saved projects", icon: FolderOpen },
  { to: "/teams", label: "Teams", icon: Users },
  { to: "/learn", label: "Learning Center", icon: GraduationCap },
  { to: "/settings/profile", label: "Profile settings", icon: Settings },
  { to: "/settings/security", label: "Security & 2FA", icon: Shield },
  { to: "/feedback", label: "Send feedback", icon: MessageSquareHeart },
] as const;

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const projectsFn = useServerFn(listProjects);

  const projects = useQuery({
    queryKey: ["saved_projects"],
    queryFn: () => projectsFn(),
    enabled: open,
    staleTime: 60000,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function go(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground transition hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search or jump to…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search tools, pages, saved projects…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          <CommandGroup heading="AI modules">
            {TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <CommandItem
                  key={t.id}
                  value={`tool ${t.label}`}
                  onSelect={() => go(() => void navigate({ to: "/tools/$tool", params: { tool: t.id } }))}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {t.label}
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Go to">
            {PAGES.map((p) => {
              const Icon = p.icon;
              return (
                <CommandItem key={p.to} value={`page ${p.label}`} onSelect={() => go(() => void navigate({ to: p.to }))}>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  {p.label}
                </CommandItem>
              );
            })}
          </CommandGroup>

          {(projects.data?.length ?? 0) > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Recent projects">
                {(projects.data ?? []).slice(0, 8).map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`project ${p.title} ${p.tool}`}
                    onSelect={() => go(() => void navigate({ to: "/projects/$id", params: { id: p.id } }))}
                  >
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{p.title}</span>
                    <span className="ml-auto text-[10px] uppercase tracking-widest text-muted-foreground">{p.tool}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
