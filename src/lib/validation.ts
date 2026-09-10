export type Severity = "error" | "warning" | "info";

export type ValidationIssue = {
  severity: Severity;
  line?: number;
  message: string;
  suggestion?: string;
};

export type ValidationResult = {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  summary: string;
  checked: string;
};

type ValidatorFn = (text: string, code: string) => ValidationIssue[];

const PLACEHOLDER_RE = /<[A-Z][A-Z0-9_]*(?:\s+[A-Za-z0-9_\-\/\.:\s]+)?>/g;
const CREDENTIAL_RE = /(?:password|secret|key|token)\s*[:=]\s*(?!\s*["']?\$\{|\s*["']?os\.getenv|env\[|getenv\(|lookup\(|vault|secretsmanager|ssm|asm\b)["']?[^\s"']{2,}["']?/gi;

function extractCodeBlocks(text: string): string[] {
  const blocks: string[] = [];
  const fenced = text.matchAll(/```(?:[a-zA-Z0-9_+-]*)\n([\s\S]*?)```/g);
  for (const m of fenced) blocks.push(m[1]);
  if (blocks.length === 0) blocks.push(text);
  return blocks;
}

function addIssue(issues: ValidationIssue[], severity: Severity, message: string, line?: number, suggestion?: string) {
  issues.push({ severity, message, line, suggestion });
}

function genericChecks(fullText: string, code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!code.trim()) {
    addIssue(issues, "error", "No executable code block found in the output.");
    return issues;
  }

  const placeholders = [...code.matchAll(PLACEHOLDER_RE)].map((m) => m[0]);
  if (placeholders.length > 0) {
    addIssue(
      issues,
      "warning",
      `${placeholders.length} placeholder(s) found: ${placeholders.slice(0, 3).join(", ")}${placeholders.length > 3 ? " …" : ""}`,
      undefined,
      "Replace placeholders like <MGMT_IP> with real values before applying.",
    );
  }

  if (/TODO|FIXME|XXX|HACK/i.test(code)) {
    addIssue(issues, "warning", "TODO/FIXME markers found — review before production use.", undefined, "Resolve all TODO items or remove them.");
  }

  const credentialHits = [...code.matchAll(CREDENTIAL_RE)];
  if (credentialHits.length > 0) {
    addIssue(issues, "error", "Hardcoded credential-like value detected.", undefined, "Use environment variables, a secrets manager, or prompt for credentials.");
  }

  return issues;
}

function ciscoChecks(_fullText: string, code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = code.split("\n");
  let inBanner = false;
  let bannerChar = "";

  lines.forEach((raw, idx) => {
    const line = raw.trim();
    const lineNo = idx + 1;
    if (!line || line.startsWith("!")) return;

    if (/^banner\s+\w+\s+\^/i.test(line)) {
      inBanner = true;
      bannerChar = "^";
    } else if (inBanner && line.includes(bannerChar)) {
      inBanner = false;
    }

    if (/interface\s+\S+/.test(line) && !/^(interface|no\s+interface)\s+/i.test(line)) {
      addIssue(issues, "warning", "Possible malformed interface command.", lineNo);
    }
  });

  if (!/hostname\s+\S+/i.test(code) && !/no\s+hostname/i.test(code)) {
    addIssue(issues, "info", "No hostname statement found — consider adding one for device identification.", undefined, "Add `hostname <NAME>`.");
  }

  if (/\bend\b/.test(code) && !/^end$/m.test(code)) {
    addIssue(issues, "info", "Ensure `end` returns to privileged EXEC mode where expected.", undefined, "Place `end` at the end of configuration blocks if required.");
  }

  if (inBanner) {
    addIssue(issues, "error", "Banner appears to be unterminated.", undefined, "Close the banner with the same delimiter character.");
  }

  return issues;
}

function juniperChecks(_fullText: string, code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!/commit/i.test(code)) {
    addIssue(issues, "warning", "No `commit` found — Junos changes are not active until committed.", undefined, "Add `commit` or `commit and-quit` at the end.");
  }
  const open = (code.match(/\{/g) ?? []).length;
  const close = (code.match(/\}/g) ?? []).length;
  if (open !== close) {
    addIssue(issues, "error", `Brace mismatch: ${open} open, ${close} close.`, undefined, "Check every opening brace has a matching closing brace.");
  }
  return issues;
}

function paloAltoChecks(_fullText: string, code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!/configure/i.test(code) && !/set\s+/i.test(code)) {
    addIssue(issues, "warning", "PAN-OS output should usually be in configuration mode or use `set` commands.", undefined, "Wrap CLI config in `configure` / `commit` if applicable.");
  }
  if (/set\s+/i.test(code) && !/commit/i.test(code)) {
    addIssue(issues, "warning", "`commit` not found — PAN-OS candidate config will not be active.", undefined, "Add `commit` after configuration changes.");
  }
  return issues;
}

function ansibleChecks(_fullText: string, code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!/^\s*-\s*name:/m.test(code) && !/^\s*tasks:/m.test(code)) {
    addIssue(issues, "warning", "No Ansible tasks detected — playbook may be incomplete.", undefined, "Add a `tasks:` list with `- name:` entries.");
  }
  if (!/^\s*hosts:/m.test(code)) {
    addIssue(issues, "warning", "No `hosts:` target defined.", undefined, "Add `hosts: all` or a specific group.");
  }
  const dashes = (code.match(/^\s*-/gm) ?? []).length;
  const nameEntries = (code.match(/^\s*-\s*name:/gm) ?? []).length;
  if (dashes > 0 && nameEntries === 0) {
    addIssue(issues, "info", "Tasks should be named for readability and idempotency logs.", undefined, "Use `- name: Do something` for each task.");
  }
  return issues;
}

function terraformChecks(_fullText: string, code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const open = (code.match(/\{/g) ?? []).length;
  const close (code.match(/\}/g) ?? []).length;
  if (open !== close) {
    addIssue(issues, "error", `HCL brace mismatch: ${open} open, ${close} close.`, undefined, "Ensure every block has matching braces.");
  }
  if (!/provider\s+"|terraform\s*\{/.test(code)) {
    addIssue(issues, "info", "No provider or terraform block found — may be a snippet only.", undefined, "Add `provider \"...\"` and required providers for a full root module.");
  }
  return issues;
}

function pythonChecks(_fullText: string, code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = code.split("\n");
  let indentStack: number[] = [0];
  let inString: string | null = null;

  lines.forEach((raw, idx) => {
    const lineNo = idx + 1;
    if (!raw.trim() || raw.trim().startsWith("#")) return;

    // Skip continuation lines inside strings
    const quoteChars = ['"', "'", '"""', "'''"];
    for (const q of quoteChars) {
      const count = (raw.match(new RegExp(q.replace(/./g, (c) => `\\${c}`), "g")) ?? []).length;
      if (inString === q) {
        if (count % 2 === 1) inString = null;
      } else if (inString === null && count > 0) {
        if (count % 2 === 1) inString = q;
      }
    }
    if (inString) return;

    const stripped = raw.replace(/#.*$/, "");
    if (/:\s*$/.test(stripped) && stripped.trim().length > 1) {
      // Block opener — next line should be indented
      indentStack.push(indentStack[indentStack.length - 1] + (stripped.match(/^(\s*)/)?.[1].length ?? 0) + 4);
    }
    const leading = raw.match(/^(\s*)/)?.[1].length ?? 0;
    if (leading > 0 && !indentStack.includes(leading)) {
      addIssue(issues, "warning", "Indentation may be inconsistent.", lineNo, "Use 4 spaces per level consistently.");
    }
  });

  if (!/import\s+/m.test(code) && /netmiko|paramiko|nornir|napalm|requests/i.test(code)) {
    addIssue(issues, "warning", "Library usage detected but no import statement found.", undefined, "Add the required import for the library you use.");
  }

  if (/print\s*\(/.test(code) && !/logging\./.test(code)) {
    addIssue(issues, "info", "Consider using the `logging` module instead of `print()` for production scripts.", undefined, "Replace `print` with `logging.info` / `logging.error`.");
  }

  return issues;
}

function bashChecks(_fullText: string, code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!/^#!/m.test(code)) {
    addIssue(issues, "info", "No shebang (`#!/bin/bash`) found — script may not run directly.", undefined, "Add `#!/bin/bash` or `#!/usr/bin/env bash` at the top.");
  }
  const open = (code.match(/\(/g) ?? []).length;
  const close = (code.match(/\)/g) ?? []).length;
  if (open !== close) {
    addIssue(issues, "warning", "Parenthesis mismatch detected.", undefined, "Check subshell/command substitution pairing.");
  }
  return issues;
}

function mopChecks(fullText: string, _code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const required = ["Pre-checks", "Backout", "Rollback", "Validation", "Post-checks"];
  for (const section of required) {
    if (!new RegExp(`##?\\s*${section}`, "i").test(fullText)) {
      addIssue(issues, "warning", `MOP section "${section}" not found.`, undefined, `Add a "${section}" heading for a complete change plan.`);
    }
  }
  if (!/##?\s*Step/i.test(fullText)) {
    addIssue(issues, "warning", "No numbered step section found in the MOP.", undefined, "Add an ordered step-by-step implementation section.");
  }
  return issues;
}

function rollbackChecks(fullText: string, _code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!/trigger/i.test(fullText)) {
    addIssue(issues, "warning", "No rollback trigger criteria found.", undefined, "Define when the rollback must be executed.");
  }
  if (!/verification/i.test(fullText)) {
    addIssue(issues, "warning", "No verification section found.", undefined, "Add verification steps to confirm rollback success.");
  }
  return issues;
}

function docsChecks(_fullText: string, code: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!/\|.*\|/.test(code) && !/mermaid/i.test(code)) {
    addIssue(issues, "info", "Consider adding a table or mermaid diagram for readability.", undefined, "Use markdown tables for IP addresses and interfaces.");
  }
  return issues;
}

const VALIDATORS: Record<string, ValidatorFn[]> = {
  cisco: [genericChecks, ciscoChecks],
  "cisco ios-xe": [genericChecks, ciscoChecks],
  "cisco nx-os": [genericChecks, ciscoChecks],
  "cisco ios-xr": [genericChecks, ciscoChecks],
  "cisco viptela sd-wan": [genericChecks, ciscoChecks],
  arista: [genericChecks, ciscoChecks],
  "arista eos": [genericChecks, ciscoChecks],
  juniper: [genericChecks, juniperChecks],
  "juniper junos": [genericChecks, juniperChecks],
  "palo alto pan-os": [genericChecks, paloAltoChecks],
  "palo alto": [genericChecks, paloAltoChecks],
  "fortinet fortios": [genericChecks, paloAltoChecks],
  ansible: [genericChecks, ansibleChecks],
  terraform: [genericChecks, terraformChecks],
  python: [genericChecks, pythonChecks],
  bash: [genericChecks, bashChecks],
  mop: [genericChecks, mopChecks],
  rollback: [genericChecks, rollbackChecks],
  docs: [genericChecks, docsChecks],
};

function normalizeKey(vendor?: string, language?: string, tool?: string): string {
  const raw = (language || vendor || tool || "").toLowerCase();
  if (raw.includes("python")) return "python";
  if (raw.includes("ansible")) return "ansible";
  if (raw.includes("terraform")) return "terraform";
  if (raw.includes("bash")) return "bash";
  if (raw.includes("cisco")) return "cisco";
  if (raw.includes("arista")) return "arista";
  if (raw.includes("juniper")) return "juniper";
  if (raw.includes("palo")) return "palo alto";
  if (raw.includes("fortinet") || raw.includes("fortios")) return "fortinet fortios";
  if (raw.includes("mop")) return "mop";
  if (raw.includes("rollback")) return "rollback";
  if (raw.includes("docs")) return "docs";
  return "generic";
}

export function validateOutput(
  output: string,
  tool: string,
  vendor?: string,
  language?: string,
): ValidationResult {
  const blocks = extractCodeBlocks(output);
  const code = blocks.join("\n\n");
  const fullText = output;

  const key = normalizeKey(vendor, language, tool);
  const fns = VALIDATORS[key] ?? [genericChecks];
  const issues: ValidationIssue[] = [];
  for (const fn of fns) issues.push(...fn(fullText, code));

  // Deduplicate by message+line
  const seen = new Set<string>();
  const unique = issues.filter((i) => {
    const k = `${i.severity}|${i.line ?? "-"}|${i.message}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const errors = unique.filter((i) => i.severity === "error").length;
  const warnings = unique.filter((i) => i.severity === "warning").length;
  const infos = unique.filter((i) => i.severity === "info").length;

  let score = 100;
  score -= errors * 25;
  score -= warnings * 8;
  score -= infos * 2;
  score = Math.max(0, Math.min(100, score));

  const valid = errors === 0;
  const summary = valid
    ? warnings > 0
      ? `Looks good — ${warnings} warning${warnings === 1 ? "" : "s"} to review.`
      : "No issues detected."
    : `${errors} critical issue${errors === 1 ? "" : "s"} must be fixed before applying this output.`;

  return {
    valid,
    score,
    issues: unique,
    summary,
    checked: key === "generic" ? "Generic structure" : key.toUpperCase(),
  };
}
