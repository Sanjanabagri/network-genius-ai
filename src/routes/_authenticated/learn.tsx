import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  BookOpen,
  Clock,
  ExternalLink,
  FileText,
  GraduationCap,
  MessagesSquare,
  PlayCircle,
  Users,
} from "lucide-react";
import { useState } from "react";
import type { ToolId } from "@/lib/ai.functions";
import { ARTICLE_CATEGORIES, ARTICLES, COMMUNITIES, DOC_LIBRARY, type Article } from "@/lib/learn-content";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({
    meta: [
      { title: "Learning Center · NetAssist AI" },
      { name: "description", content: "Guided paths, knowledge articles, vendor documentation and community help for network engineers." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LearnPage,
});

type Lesson = { title: string; summary: string; tool: ToolId; prompt: string };
type Path = { title: string; level: string; blurb: string; lessons: Lesson[] };

const PATHS: Path[] = [
  {
    title: "Network Automation Foundations",
    level: "Beginner",
    blurb: "Go from CLI-by-hand to repeatable, reviewed automation.",
    lessons: [
      {
        title: "Your first device config from a prompt",
        summary: "Describe intent in plain English and get a vendor-correct config.",
        tool: "config",
        prompt: "Create a Cisco IOS-XE access switch baseline: hostname, NTP, SSH-only management, AAA to RADIUS, and 24 access ports on VLAN 20 with portfast and BPDU guard.",
      },
      {
        title: "Reading show output like a senior engineer",
        summary: "Turn noisy CLI output into a ranked list of likely causes.",
        tool: "cli",
        prompt: "Analyze this output and tell me why the OSPF neighbor is stuck in EXSTART:\n\n<paste show ip ospf neighbor and show log here>",
      },
      {
        title: "Automating with Python + Netmiko",
        summary: "Write an idempotent script that pushes config to an inventory.",
        tool: "automation-studio",
        prompt: "Write a Netmiko script that reads devices from inventory.yaml, backs up the running config, then applies an NTP server change, with rollback on failure.",
      },
    ],
  },
  {
    title: "Multi-Vendor Enterprise Design",
    level: "Intermediate",
    blurb: "Ship the same intent across Cisco, Palo Alto, Fortinet and Juniper.",
    lessons: [
      {
        title: "One intent, four vendors",
        summary: "Compare syntax and feature parity side by side.",
        tool: "multi-vendor",
        prompt: "Configure an IPSec site-to-site VPN between a branch and datacenter with IKEv2, AES-256, PFS group 14, and dead peer detection.",
      },
      {
        title: "Firewall policy hardening",
        summary: "Least-privilege rulebases with logging and zone hygiene.",
        tool: "multi-vendor",
        prompt: "Create a hardened DMZ security policy: allow only HTTPS inbound to web servers, deny all east-west by default, log denies, and add anti-spoofing.",
      },
      {
        title: "Documenting the design",
        summary: "Auto-generate IP plans, topology notes and diagrams-as-code.",
        tool: "docs",
        prompt: "Generate network documentation for a two-datacenter design with BGP between them, including an interface/IP table and a mermaid topology diagram.",
      },
    ],
  },
  {
    title: "Change & Incident Excellence",
    level: "Advanced",
    blurb: "Run changes and outages the way audited enterprises expect.",
    lessons: [
      {
        title: "Writing a bulletproof MOP",
        summary: "Pre-checks, step-by-step CLI, validation and backout criteria.",
        tool: "mop",
        prompt: "Write a MOP to migrate a core switch stack from HSRP to VRRP during a 2-hour window, with pre-checks and post-checks.",
      },
      {
        title: "Rollback plans that actually work",
        summary: "Trigger criteria, exact reverse commands, verification.",
        tool: "rollback",
        prompt: "Create a rollback plan for a BGP local-preference change that caused asymmetric routing between two ISPs.",
      },
      {
        title: "Incident postmortems in minutes",
        summary: "Turn a raw timeline into an executive-ready RCA.",
        tool: "incident",
        prompt: "Summarize this incident: at 02:14 a WAN circuit flapped, BFD tore down the tunnel, branch users lost VoIP for 38 minutes until failover was forced manually.",
      },
    ],
  },
];

const TABS = [
  { id: "paths", label: "Guided paths", icon: GraduationCap },
  { id: "articles", label: "Knowledge articles", icon: FileText },
  { id: "docs", label: "Vendor documentation", icon: BookOpen },
  { id: "communities", label: "Communities", icon: MessagesSquare },
] as const;

type TabId = (typeof TABS)[number]["id"];

function LearnPage() {
  const [tab, setTab] = useState<TabId>("paths");
  const [category, setCategory] = useState<(typeof ARTICLE_CATEGORIES)[number]>("All");
  const [openArticle, setOpenArticle] = useState<Article | null>(null);

  const filteredArticles = category === "All" ? ARTICLES : ARTICLES.filter((a) => a.category === category);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/dashboard" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-primary text-primary-foreground shadow-glow">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Learning Center</h1>
          <p className="mt-1 text-muted-foreground">
            Hands-on paths, field guides, vendor documentation and communities for when you're stuck.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Learning Center sections">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                active
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Guided paths */}
      {tab === "paths" && (
        <div className="mt-8 grid gap-8">
          {PATHS.map((path) => (
            <section key={path.title} className="rounded-2xl border border-border bg-card p-5 sm:p-6">
              <div className="flex flex-wrap items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="font-display text-xl font-semibold">{path.title}</h2>
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
                  {path.level}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{path.blurb}</p>

              <ol className="mt-5 grid gap-3 md:grid-cols-3">
                {path.lessons.map((lesson, i) => (
                  <li key={lesson.title}>
                    <Link
                      to="/tools/$tool"
                      params={{ tool: lesson.tool }}
                      search={{ prompt: lesson.prompt }}
                      className="group flex h-full flex-col rounded-xl border border-border bg-background p-4 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                    >
                      <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Lesson {i + 1}
                      </span>
                      <span className="mt-1 font-display text-base font-semibold">{lesson.title}</span>
                      <span className="mt-1 flex-1 text-sm text-muted-foreground">{lesson.summary}</span>
                      <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                        <PlayCircle className="h-4 w-4" /> Start lesson
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}

      {/* Knowledge articles */}
      {tab === "articles" && (
        <div className="mt-8">
          <div className="flex flex-wrap gap-2" aria-label="Filter articles by category">
            {ARTICLE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                  category === cat
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {filteredArticles.map((article) => (
              <button
                key={article.slug}
                onClick={() => setOpenArticle(article)}
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
                    {article.category}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {article.readMinutes} min read
                  </span>
                </div>
                <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{article.title}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{article.summary}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {article.vendors.map((v) => (
                    <span key={v} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {v}
                    </span>
                  ))}
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <BookOpen className="h-4 w-4" /> Read article
                </span>
              </button>
            ))}
          </div>

          {/* Article reader dialog */}
          <Dialog open={openArticle !== null} onOpenChange={(open) => !open && setOpenArticle(null)}>
            <DialogContent className="max-w-3xl p-0">
              {openArticle && (
                <ScrollArea className="max-h-[80vh]">
                  <div className="p-6 sm:p-8">
                    <DialogHeader>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
                          {openArticle.category}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {openArticle.readMinutes} min
                        </span>
                      </div>
                      <DialogTitle className="mt-2 font-display text-2xl leading-snug">{openArticle.title}</DialogTitle>
                      <DialogDescription>{openArticle.summary}</DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 space-y-6">
                      {openArticle.sections.map((section) => (
                        <section key={section.heading}>
                          <h3 className="font-display text-lg font-semibold">{section.heading}</h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                          {section.bullets && (
                            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                              {section.bullets.map((b) => (
                                <li key={b}>{b}</li>
                              ))}
                            </ul>
                          )}
                          {section.code && (
                            <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-background p-4 font-mono text-xs leading-relaxed">
                              {section.code}
                            </pre>
                          )}
                        </section>
                      ))}
                    </div>

                    {openArticle.tool && openArticle.prompt && (
                      <div className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-5">
                        <p className="text-sm font-medium">Try it hands-on</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Open the related AI tool with a ready-made prompt based on this article.
                        </p>
                        <Link
                          to="/tools/$tool"
                          params={{ tool: openArticle.tool }}
                          search={{ prompt: openArticle.prompt }}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                          onClick={() => setOpenArticle(null)}
                        >
                          <PlayCircle className="h-4 w-4" /> Open tool
                        </Link>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Vendor documentation */}
      {tab === "docs" && (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {DOC_LIBRARY.map((group) => (
            <section key={group.vendor} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">{group.vendor}</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start justify-between gap-3 rounded-xl border border-border bg-background p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
                    >
                      <span>
                        <span className="block text-sm font-medium text-foreground">{link.label}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">{link.note}</span>
                      </span>
                      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Communities */}
      {tab === "communities" && (
        <div className="mt-8">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold">Ask the community</h2>
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Stuck on an issue? These are the places working network engineers actually answer questions — vendor-official
              forums and vendor-neutral groups.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {COMMUNITIES.map((community) => (
              <a
                key={community.name}
                href={community.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-elevated"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-accent">
                    {community.kind}
                  </span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <h3 className="mt-3 font-display text-base font-semibold leading-snug">{community.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{community.blurb}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {community.vendors.map((v) => (
                    <span key={v} className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {v}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
