import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity, ArrowRight, Bot, Boxes, Check, CircuitBoard, Cpu, FileCode2,
  FileText, Gauge, GitBranch, Github, Globe2, Layers, LineChart, Lock,
  Menu, MessagesSquare, Network, Rocket, Server, ShieldCheck, Sparkles,
  Terminal, Wand2, Workflow, X, Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NetAssist AI — Automate. Troubleshoot. Accelerate." },
      { name: "description", content: "AI copilot for network engineers. Generate Cisco / Palo Alto / Fortinet / SD-WAN configurations, troubleshoot CLI output, and build Python + Ansible automation instantly." },
      { property: "og:title", content: "NetAssist AI — Automate. Troubleshoot. Accelerate." },
      { property: "og:description", content: "The AI copilot built for Network, NOC, Security, and SD-WAN engineers." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Nav />
      <Hero />
      <Logos />
      <Modules />
      <HowItWorks />
      <Showcase />
      <Testimonials />
      <Pricing />
      <FAQ />
      <CTA />
      <Footer />
    </div>
  );
}

/* ---------------- NAV ---------------- */
function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-primary shadow-glow">
        <Network className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <span className="font-display text-lg font-bold tracking-tight">
        NetAssist <span className="text-gradient">AI</span>
      </span>
    </div>
  );
}

function Nav() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
    return () => sub.subscription.unsubscribe();
  }, []);
  const links = [
    { href: "#modules", label: "Modules" },
    { href: "#how", label: "How it works" },
    { href: "#pricing", label: "Pricing" },
    { href: "#faq", label: "FAQ" },
  ];
  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
        <div className="glass flex items-center justify-between gap-4 rounded-2xl px-4 py-2.5 shadow-sm">
          <Link to="/"><Logo /></Link>
          <nav className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {signedIn ? (
              <Link
                to="/dashboard"
                className="group inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:-translate-y-0.5"
              >
                Go to dashboard <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ) : (
              <>
                <Link to="/auth" className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                  Sign in
                </Link>
                <Link
                  to="/auth"
                  search={{ mode: "signup" }}
                  className="group inline-flex items-center gap-1.5 rounded-lg bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:-translate-y-0.5"
                >
                  Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>
          <button
            onClick={() => setOpen(!open)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-border md:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
        {open && (
          <div className="glass mt-2 rounded-2xl p-4 md:hidden animate-fade-up">
            <nav className="flex flex-col gap-3">
              {links.map((l) => (
                <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm text-muted-foreground">
                  {l.label}
                </a>
              ))}
              {signedIn ? (
                <Link to="/dashboard" className="mt-2 rounded-lg bg-gradient-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground">
                  Go to dashboard
                </Link>
              ) : (
                <Link to="/auth" search={{ mode: "signup" }} className="mt-2 rounded-lg bg-gradient-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground">
                  Get started
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

/* ---------------- HERO ---------------- */
function Hero() {
  return (
    <section className="relative">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-70" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-hero opacity-20 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24 lg:pt-32">
        <div className="mx-auto max-w-3xl text-center animate-fade-up">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-pulse-glow rounded-full bg-accent" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            New · GPT-powered SD-WAN Analyzer is live
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Automate. Troubleshoot.<br />
            <span className="text-gradient">Accelerate.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
            The AI copilot for Network, NOC, Security, and SD-WAN engineers. Generate configurations,
            analyze CLI output, and ship Python & Ansible automation in seconds — not hours.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href="#pricing" className="group inline-flex items-center gap-2 rounded-xl bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-elevated transition-transform hover:-translate-y-0.5">
              Get started free <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#modules" className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted">
              <Sparkles className="h-4 w-4 text-accent" /> Try the demo
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> No credit card required</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> 10 free AI requests/day</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" /> SSO for teams</span>
          </div>
        </div>

        {/* Terminal mockup */}
        <div className="relative mx-auto mt-16 max-w-5xl animate-fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="absolute -inset-4 bg-gradient-primary opacity-30 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-destructive/70" />
              <span className="h-3 w-3 rounded-full bg-accent/70" />
              <span className="h-3 w-3 rounded-full bg-secondary/70" />
              <div className="ml-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Terminal className="h-3.5 w-3.5" /> netassist · configure/bgp-peering
              </div>
            </div>
            <div className="grid gap-0 md:grid-cols-[1fr_1.2fr]">
              <div className="border-b border-border p-5 font-mono text-xs md:border-b-0 md:border-r">
                <div className="text-muted-foreground">// Prompt</div>
                <p className="mt-2 text-foreground">
                  Generate a Cisco IOS BGP config for AS 65010, peer 10.0.0.1 AS 65020,
                  advertise 172.16.0.0/22, apply outbound prefix-list.
                </p>
                <div className="mt-4 text-muted-foreground">// Vendor</div>
                <p className="mt-1"><span className="rounded-md bg-primary/15 px-2 py-0.5 text-primary">Cisco IOS</span></p>
                <div className="mt-4 text-muted-foreground">// Feature</div>
                <p className="mt-1"><span className="rounded-md bg-secondary/15 px-2 py-0.5 text-secondary">BGP</span></p>
              </div>
              <div className="bg-[color:var(--muted)]/40 p-5 font-mono text-[11px] leading-relaxed sm:text-xs">
                <pre className="overflow-x-auto text-foreground/90">{`router bgp 65010
 bgp router-id 10.255.0.1
 bgp log-neighbor-changes
 network 172.16.0.0 mask 255.255.252.0
 neighbor 10.0.0.1 remote-as 65020
 neighbor 10.0.0.1 description PEER-EDGE-01
 neighbor 10.0.0.1 prefix-list PL-OUT out
 neighbor 10.0.0.1 send-community
!
ip prefix-list PL-OUT seq 5 permit 172.16.0.0/22
!
! ✓ Validated  ✓ Best-practice  ✓ Rollback ready`}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- LOGOS ---------------- */
function Logos() {
  const vendors = ["Cisco", "Palo Alto", "Fortinet", "Juniper", "Arista", "Aruba", "VMware", "Meraki"];
  return (
    <section className="border-y border-border/60 bg-muted/30 py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Trusted by engineers automating gear from
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {vendors.map((v) => (
            <div key={v} className="grid place-items-center font-display text-sm font-semibold text-muted-foreground/80 transition-colors hover:text-foreground">
              {v}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- MODULES ---------------- */
const modules = [
  { icon: Wand2, title: "AI Config Generator", desc: "Cisco, Palo Alto, Fortinet, SD-WAN. VLAN, BGP, OSPF, MPLS, security policies — validated and rollback-ready.", tone: "primary" as const },
  { icon: Terminal, title: "CLI Troubleshooter", desc: "Paste `show` output. Get root cause, severity, next commands, and escalation guidance in seconds.", tone: "accent" as const },
  { icon: FileCode2, title: "Automation Scripts", desc: "Python (Netmiko, NAPALM, Nornir), Ansible, and Terraform playbooks generated on demand.", tone: "secondary" as const },
  { icon: GitBranch, title: "Change Management", desc: "Auto-generated MOPs, rollback plans, risk assessment and impact analysis. Export to PDF/DOCX.", tone: "primary" as const },
  { icon: FileText, title: "Documentation", desc: "Turn running configs into device inventories, IP plans, and executive architecture summaries.", tone: "accent" as const },
  { icon: MessagesSquare, title: "Incident Manager", desc: "Convert raw logs into a clear timeline, summary, resolution, and lessons learned.", tone: "secondary" as const },
  { icon: Activity, title: "SD-WAN Analyzer", desc: "Health-score TLOCs and tunnels. Surface packet loss, jitter, and latency with recommendations.", tone: "primary" as const },
  { icon: Boxes, title: "Learning Center", desc: "CCNA/CCNP, Palo Alto, SD-WAN notes and interview prep — searchable with progress tracking.", tone: "accent" as const },
];

const toneStyles = {
  primary: { bg: "bg-primary/15", text: "text-primary", glow: "bg-primary" },
  secondary: { bg: "bg-secondary/15", text: "text-secondary", glow: "bg-secondary" },
  accent: { bg: "bg-accent/20", text: "text-accent", glow: "bg-accent" },
};

function Modules() {
  return (
    <section id="modules" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-accent" /> One platform · Eight AI modules
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            Every network task, <span className="text-gradient">AI-native</span>.
          </h2>
          <p className="mt-4 text-muted-foreground">
            Purpose-built for engineers who ship. Modular. Vendor-aware. Production-safe.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m, i) => {
            const Icon = m.icon;
            const s = toneStyles[m.tone];
            return (
              <div
                key={m.title}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-elevated animate-fade-up"
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={`absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-40 ${s.glow}`} />
                <div className={`inline-grid h-11 w-11 place-items-center rounded-xl ${s.bg} ${s.text}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-base font-semibold">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- HOW IT WORKS ---------------- */
function HowItWorks() {
  const steps = [
    { icon: Cpu, title: "Describe the task", desc: "Choose a vendor, drop CLI, or type a plain-English request." },
    { icon: Bot, title: "AI does the heavy lift", desc: "Vendor-aware models produce validated configs, scripts, and playbooks." },
    { icon: Rocket, title: "Review, export, deploy", desc: "Copy, download, or push straight into your change workflow." },
  ];
  return (
    <section id="how" className="relative py-24">
      <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-30" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            From prompt to production in <span className="text-gradient">three steps</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="glass relative rounded-2xl p-8">
                <div className="absolute -top-4 left-6 grid h-8 w-8 place-items-center rounded-lg bg-gradient-primary text-xs font-bold text-primary-foreground shadow-glow">
                  {i + 1}
                </div>
                <Icon className="h-8 w-8 text-accent" />
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ---------------- SHOWCASE ---------------- */
function Showcase() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              <Gauge className="h-3.5 w-3.5 text-accent" /> Real-time analyzer
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Turn CLI dumps into <span className="text-gradient">actionable insight</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Paste `show bgp summary` or a stack of syslogs. NetAssist AI classifies severity,
              pinpoints root cause, and gives you the exact commands to run next.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Root cause & severity in seconds",
                "Suggested remediation commands",
                "Escalation guidance & runbooks",
                "One-click export to your incident report",
              ].map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 place-items-center rounded-full bg-accent/20 text-accent">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 bg-gradient-accent opacity-20 blur-3xl" />
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CircuitBoard className="h-4 w-4 text-secondary" /> Incident #INC-4821
                </div>
                <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">Critical</span>
              </div>
              <div className="space-y-4 p-5">
                <div className="rounded-lg bg-muted/60 p-3 font-mono text-[11px] text-muted-foreground">
                  %BGP-3-NOTIFICATION: sent to neighbor 10.0.0.1 4/0 (hold time expired)<br />
                  %LINEPROTO-5-UPDOWN: Line protocol on Gi0/1, changed state to down
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Root cause</div>
                  <p className="mt-1 text-sm">BGP hold timer expired on peer 10.0.0.1 following L1 flap on Gi0/1. Physical link instability upstream.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Stat label="Severity" value="P1" tone="destructive" />
                  <Stat label="Confidence" value="94%" tone="accent" />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Next commands</div>
                  <pre className="mt-1 overflow-x-auto rounded-lg bg-muted/60 p-3 font-mono text-[11px]">show interface Gi0/1
show controllers Gi0/1
clear counters Gi0/1</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: "destructive" | "accent" | "secondary" }) {
  const toneMap = {
    destructive: "bg-destructive/10 text-destructive",
    accent: "bg-accent/10 text-accent",
    secondary: "bg-secondary/10 text-secondary",
  };
  const [bg, text] = toneMap[tone].split(" ");
  return (
    <div className={`rounded-lg border border-border p-3 ${bg}`}>
      <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-xl font-bold ${text}`}>{value}</div>
    </div>
  );
}

/* ---------------- TESTIMONIALS ---------------- */
function Testimonials() {
  const items = [
    { quote: "It generated a validated Palo Alto policy set in 30 seconds. Would've taken me an hour.", name: "Priya S.", role: "Senior Network Security Engineer" },
    { quote: "The CLI troubleshooter turned a 3AM P1 into a 10-minute fix. The runbook is on point.", name: "Marcus O.", role: "NOC Lead" },
    { quote: "Our team ships Ansible playbooks 5x faster. NetAssist is now part of every change.", name: "Elena R.", role: "Network Automation Architect" },
  ];
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Loved by engineers who <span className="text-gradient">ship on-call</span>
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {items.map((t) => (
            <figure key={t.name} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <blockquote className="text-sm leading-relaxed text-foreground">"{t.quote}"</blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-primary text-xs font-semibold text-primary-foreground">
                  {t.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- PRICING ---------------- */
function Pricing() {
  const plans = [
    {
      name: "Free", price: "$0", period: "forever",
      desc: "For engineers exploring AI-assisted networking.",
      features: ["10 AI requests / day", "Save up to 5 projects", "Basic config generation", "Community support"],
      cta: "Start free", highlight: false,
    },
    {
      name: "Pro", price: "$9", period: "/month",
      desc: "For working professionals who ship every day.",
      features: ["Unlimited AI requests", "Advanced troubleshooting", "Automation scripts", "PDF & DOCX export", "Priority support"],
      cta: "Upgrade to Pro", highlight: true,
    },
    {
      name: "Enterprise", price: "$49", period: "/month",
      desc: "For teams standardizing network operations.",
      features: ["Everything in Pro", "Team & workspace management", "SSO (SAML/OIDC)", "API access", "Audit logs & analytics"],
      cta: "Contact sales", highlight: false,
    },
  ];
  return (
    <section id="pricing" className="relative py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Simple, <span className="text-gradient">transparent</span> pricing
          </h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade when you're ready to scale.</p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-8 transition-all ${
                p.highlight
                  ? "border-transparent bg-gradient-primary text-primary-foreground shadow-elevated lg:-translate-y-2"
                  : "border-border bg-card"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-lg font-semibold">{p.name}</h3>
              <p className={`mt-1 text-sm ${p.highlight ? "text-primary-foreground/80" : "text-muted-foreground"}`}>{p.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-4xl font-bold tracking-tight">{p.price}</span>
                <span className={`text-sm ${p.highlight ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{p.period}</span>
              </div>
              <ul className="mt-6 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.highlight ? "text-accent" : "text-accent"}`} strokeWidth={3} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`mt-8 w-full rounded-xl px-5 py-3 text-sm font-semibold transition-all ${
                  p.highlight
                    ? "bg-background text-foreground hover:opacity-90"
                    : "bg-foreground text-background hover:opacity-90"
                }`}
              >
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- FAQ ---------------- */
function FAQ() {
  const faqs = [
    { q: "Which vendors are supported?", a: "Cisco IOS/IOS-XE/NX-OS, Palo Alto (PAN-OS + Panorama), Fortinet FortiGate, Cisco SD-WAN (Viptela), and more added regularly." },
    { q: "Is my data private?", a: "Yes. Configs and CLI you paste are processed for your session only and never used to train models. Enterprise plans get isolated workspaces and audit logs." },
    { q: "Can I export configurations?", a: "Every output can be copied, downloaded, or exported to PDF/DOCX. Change management artifacts include rollback plans." },
    { q: "Do you support SSO?", a: "SSO via SAML and OIDC is available on the Enterprise plan, along with role-based access control." },
    { q: "How does the free tier work?", a: "10 AI requests per day and up to 5 saved projects. No credit card required." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked <span className="text-gradient">questions</span>
        </h2>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
          {faqs.map((f, i) => (
            <div key={f.q} className="p-5">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 text-left"
              >
                <span className="font-medium">{f.q}</span>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted transition-transform ${open === i ? "rotate-45" : ""}`}>
                  <span className="text-lg leading-none">+</span>
                </span>
              </button>
              {open === i && (
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground animate-fade-up">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- CTA ---------------- */
function CTA() {
  return (
    <section className="px-4 pb-24 sm:px-6">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-gradient-hero p-10 text-center shadow-elevated sm:p-16">
        <div className="pointer-events-none absolute inset-0 bg-gradient-mesh opacity-40" />
        <div className="relative">
          <Zap className="mx-auto h-10 w-10 text-accent animate-pulse-glow" />
          <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-5xl">
            Ship networks at the speed of thought.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-primary-foreground/80">
            Join thousands of engineers using NetAssist AI to automate the tedious parts of the job.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href="#pricing" className="inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground shadow-elevated transition-transform hover:-translate-y-0.5">
              Get started free <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#modules" className="inline-flex items-center gap-2 rounded-xl border border-primary-foreground/30 px-6 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10">
              Explore modules
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------- FOOTER ---------------- */
function Footer() {
  const cols = [
    { title: "Product", links: ["Modules", "Pricing", "Changelog", "Roadmap"] },
    { title: "Resources", links: ["Docs", "Learning Center", "Blog", "Community"] },
    { title: "Company", links: ["About", "Careers", "Contact", "Press kit"] },
    { title: "Legal", links: ["Privacy", "Terms", "Security", "DPA"] },
  ];
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(4,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The AI copilot for network engineers. Automate. Troubleshoot. Accelerate.
            </p>
            <div className="mt-5 flex items-center gap-3">
              {[Github, Globe2, ShieldCheck, Server].map((Icon, i) => (
                <a key={i} href="#" className="grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display text-sm font-semibold">{c.title}</h4>
              <ul className="mt-4 space-y-2">
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} NetAssist AI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> SOC 2 in progress</span>
            <span className="inline-flex items-center gap-1.5"><Workflow className="h-3.5 w-3.5" /> Built for engineers</span>
            <span className="inline-flex items-center gap-1.5"><LineChart className="h-3.5 w-3.5" /> 99.9% uptime</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
