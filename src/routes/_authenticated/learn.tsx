import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen, GraduationCap, PlayCircle } from "lucide-react";
import type { ToolId } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/learn")({
  head: () => ({
    meta: [
      { title: "Learning Center · NetAssist AI" },
      { name: "description", content: "Guided paths for network automation: BGP, SD-WAN, firewall policy, Python and Ansible playbooks." },
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

function LearnPage() {
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
            Hands-on paths — every lesson opens a real tool with the prompt pre-loaded.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-8">
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
    </main>
  );
}
