export type PlanTier = "free" | "pro" | "team";

export type PlanDef = {
  id: PlanTier;
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  highlight?: boolean;
  /** AI generations allowed per day. null = unlimited */
  dailyAiLimit: number | null;
  /** Saved projects allowed. null = unlimited */
  projectLimit: number | null;
  teams: boolean;
};

export const PLANS: Record<PlanTier, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    desc: "For engineers exploring AI-assisted networking.",
    features: [
      "10 AI generations / day",
      "Up to 5 saved projects",
      "Config generator & troubleshooter",
      "Community support",
    ],
    dailyAiLimit: 10,
    projectLimit: 5,
    teams: false,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: "$19",
    period: "/month",
    desc: "For working professionals who ship every day.",
    features: [
      "Unlimited AI generations",
      "Unlimited saved projects",
      "Automation Studio & MOP builder",
      "PDF & DOCX export",
      "Config validation engine",
      "Priority support",
    ],
    highlight: true,
    dailyAiLimit: null,
    projectLimit: null,
    teams: false,
  },
  team: {
    id: "team",
    name: "Team",
    price: "$49",
    period: "/month",
    desc: "For NOC and network teams standardizing operations.",
    features: [
      "Everything in Pro",
      "Shared team workspaces",
      "Role-based access control",
      "Team project library",
      "Usage analytics",
      "Onboarding assistance",
    ],
    dailyAiLimit: null,
    projectLimit: null,
    teams: true,
  },
};

export const PLAN_ORDER: PlanTier[] = ["free", "pro", "team"];

export function planOf(tier: string | null | undefined): PlanDef {
  return PLANS[(tier as PlanTier) in PLANS ? (tier as PlanTier) : "free"];
}
