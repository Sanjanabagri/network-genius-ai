/** Server-only aggregation helpers for the admin dashboard. No fake data: every
 * number here is derived from rows passed in by the caller. */

export type RawEvent = {
  id: string;
  user_id: string | null;
  event_type: string;
  path: string | null;
  created_at: string;
};

export type RawAiRequest = {
  id: string;
  user_id: string | null;
  tool: string;
  status: string;
  total_tokens: number | null;
  duration_ms: number | null;
  created_at: string;
};

export type AuthUserLite = {
  id: string;
  email: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  banned: boolean;
};

export const TOOL_LABELS: Record<string, string> = {
  config: "AI Config Generator",
  troubleshoot: "Network Troubleshooter",
  script: "Automation Script Generator",
  mop: "MOP / Change Request",
  rollback: "Rollback Plan Generator",
  cli: "CLI Output Analyzer",
  docs: "Network Documentation",
  incident: "Incident Summary",
  workflow: "Automation Workflow",
  "multi-vendor": "Multi-Vendor Config Generator",
  troubleshooter: "AI Troubleshooter (files)",
  "automation-studio": "Automation Studio",
};

export function toolLabel(tool: string): string {
  return TOOL_LABELS[tool] ?? tool;
}

export function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function startOfTodayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function daysAgoISO(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

export function startOfMonthISO(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

/** Builds an ordered day-bucket map for the last `days` days (inclusive of today). */
export function emptyDailyBuckets(days: number) {
  const map = new Map<string, { logins: number; views: number; ai: number; users: Set<string> }>();
  for (let i = days - 1; i >= 0; i--) {
    map.set(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10), {
      logins: 0,
      views: 0,
      ai: 0,
      users: new Set<string>(),
    });
  }
  return map;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
