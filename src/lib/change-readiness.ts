export type ChangeReadinessInput = {
  title: string;
  description?: string | null;
  devices?: string | null;
  plan?: string | null;
  risk?: string | null;
  scheduledFor?: string | null;
  inventoryHostnames: string[];
};

export type ReadinessCheck = {
  id: string;
  label: string;
  ready: boolean;
  detail: string;
};

export type ChangeReadiness = {
  ready: boolean;
  readyCount: number;
  total: number;
  percentage: number;
  checks: ReadinessCheck[];
};

function includesHostname(scope: string, hostname: string) {
  const escaped = hostname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-zA-Z0-9_.-])${escaped}($|[^a-zA-Z0-9_.-])`, "i").test(scope);
}

export function assessChangeReadiness(input: ChangeReadinessInput): ChangeReadiness {
  const scope = input.devices?.trim() ?? "";
  const plan = input.plan?.trim() ?? "";
  const matchedHostnames = input.inventoryHostnames.filter((hostname) =>
    hostname.trim() && includesHostname(scope, hostname.trim()),
  );
  const highRisk = input.risk?.toLowerCase() === "high";

  const checks: ReadinessCheck[] = [
    {
      id: "purpose",
      label: "Change purpose",
      ready: Boolean(input.title.trim() && input.description?.trim()),
      detail: "Add a title and a business reason.",
    },
    {
      id: "target-devices",
      label: "Target devices",
      ready: matchedHostnames.length > 0,
      detail: scope
        ? "Use at least one exact hostname from Device Inventory."
        : "List the target device hostname(s).",
    },
    {
      id: "pre-checks",
      label: "Pre-change checks",
      ready: /\b(pre[\s-]?checks?|pre-change|before the change|baseline checks?)\b/i.test(plan),
      detail: "Include pre-checks or a baseline section in the plan.",
    },
    {
      id: "implementation",
      label: "Implementation steps",
      ready: /\b(implementation|execution steps?|change steps?|configuration steps?|apply the change)\b/i.test(plan),
      detail: "Describe the implementation or execution steps.",
    },
    {
      id: "verification",
      label: "Post-change verification",
      ready: /\b(post[\s-]?checks?|verification|verify|validation|validate|success criteria)\b/i.test(plan),
      detail: "Add post-checks or verification criteria.",
    },
    {
      id: "rollback",
      label: "Rollback plan",
      ready: /\b(rollback|roll back|back[\s-]?out|revert plan)\b/i.test(plan),
      detail: "Describe how to roll back or back out the change.",
    },
    {
      id: "maintenance-window",
      label: "Scheduled window",
      ready: !highRisk || Boolean(input.scheduledFor?.trim()),
      detail: highRisk ? "Schedule a maintenance window for high-risk work." : "Required for high-risk changes only.",
    },
  ];

  const readyCount = checks.filter((check) => check.ready).length;
  const total = checks.length;

  return {
    ready: readyCount === total,
    readyCount,
    total,
    percentage: Math.round((readyCount / total) * 100),
    checks: checks.map((check) => {
      if (check.id === "target-devices" && matchedHostnames.length > 0) {
        return { ...check, detail: `Inventory match: ${matchedHostnames.join(", ")}.` };
      }
      if (check.id === "maintenance-window" && !highRisk) {
        return { ...check, detail: "Not required for this risk level." };
      }
      return check;
    }),
  };
}