import type { ComponentType } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  GitPullRequestArrow,
  Radar,
  ShieldCheck,
  Sparkles,
  TerminalSquare
} from "lucide-react";

export type RepoNode = {
  name: string;
  depth: number;
  kind: "folder" | "file";
  active?: boolean;
};

export type GuardrailFile = {
  path: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  status: "generated" | "ready";
  preview: string[];
};

export type RiskState = "good" | "review" | "high";

export type RiskCheck = {
  id: string;
  label: string;
  detail: string;
  state: RiskState;
  evidence: string;
};

export type WorkflowStep = {
  id: string;
  label: string;
  detail: string;
  icon: ComponentType<{ className?: string }>;
};

export const repoNodes: RepoNode[] = [
  { name: "my-saas-app", depth: 0, kind: "folder", active: true },
  { name: ".github", depth: 1, kind: "folder" },
  { name: "copilot-instructions.md", depth: 2, kind: "file" },
  { name: ".codeward", depth: 1, kind: "folder" },
  { name: "repo-map.json", depth: 2, kind: "file", active: true },
  { name: "apps", depth: 1, kind: "folder" },
  { name: "web", depth: 2, kind: "folder" },
  { name: "packages", depth: 1, kind: "folder" },
  { name: "rules", depth: 2, kind: "folder" },
  { name: "AGENTS.md", depth: 1, kind: "file", active: true },
  { name: ".env.example", depth: 1, kind: "file" },
  { name: "package.json", depth: 1, kind: "file" }
];

export const guardrailFiles: GuardrailFile[] = [
  {
    path: "AGENTS.md",
    title: "Agent operating rules",
    description: "Repository-specific boundaries, validation commands, and safety rules.",
    icon: FileText,
    status: "generated",
    preview: [
      "# CodeWard Agent Instructions",
      "Core flow: analyze repo -> write guardrails -> enforce policy.",
      "Never commit secrets. Keep changes focused. Run pnpm check before shipping."
    ]
  },
  {
    path: ".github/copilot-instructions.md",
    title: "Copilot context",
    description: "Short, stable instructions for editor agents and PR work.",
    icon: Sparkles,
    status: "generated",
    preview: [
      "Prefer deterministic checks over model judgment.",
      "Use TypeScript strict mode and existing package boundaries.",
      "Do not run arbitrary repo shell commands from product features."
    ]
  },
  {
    path: ".codeward/repo-map.json",
    title: "Repository map",
    description: "Machine-readable project signals for CI and local review.",
    icon: FileJson,
    status: "ready",
    preview: [
      "{",
      '  "frameworks": ["react", "typescript", "vite"],',
      '  "riskyPaths": ["src/server/auth/**", ".github/workflows/**"]',
      "}"
    ]
  },
  {
    path: ".github/workflows/codeward.yml",
    title: "CI guardrail workflow",
    description: "GitHub-friendly annotations and fail-on-error policy.",
    icon: FileCode2,
    status: "ready",
    preview: [
      "on: pull_request",
      "permissions: contents: read",
      "steps: pnpm codeward ci --fail-on error"
    ]
  }
];

export const riskChecks: RiskCheck[] = [
  {
    id: "tests",
    label: "tests",
    detail: "Changed packages have nearby test coverage.",
    state: "good",
    evidence: "packages/rules/src/index.test.ts"
  },
  {
    id: "env-drift",
    label: "env drift",
    detail: "Environment keys changed and need reviewer attention.",
    state: "review",
    evidence: ".env.example updated without matching docs"
  },
  {
    id: "risky-files",
    label: "risky files",
    detail: "Authentication and workflow paths are sensitive.",
    state: "high",
    evidence: ".github/workflows/codeward.yml"
  },
  {
    id: "dependencies",
    label: "dependencies",
    detail: "Package changes are limited to approved app dependencies.",
    state: "good",
    evidence: "pnpm-lock.yaml"
  },
  {
    id: "secrets",
    label: "secrets scan",
    detail: "No hardcoded token-like values detected in changed files.",
    state: "good",
    evidence: "deterministic pattern scan"
  }
];

export const workflowSteps: WorkflowStep[] = [
  {
    id: "scan",
    label: "Scan",
    detail: "Repository structure, scripts, env keys, and risky paths.",
    icon: Radar
  },
  {
    id: "guardrails",
    label: "Guardrails",
    detail: "Generate AGENTS.md, Copilot instructions, and repo map.",
    icon: ShieldCheck
  },
  {
    id: "checks",
    label: "Checks",
    detail: "Run deterministic rules for PR-ready evidence.",
    icon: CheckCircle2
  },
  {
    id: "report",
    label: "PR Report",
    detail: "Produce reviewer-friendly findings and annotations.",
    icon: GitPullRequestArrow
  }
];

export const commands = [
  {
    id: "init",
    label: "Initialize",
    command: "pnpm codeward init --root .",
    output: ["created AGENTS.md", "created .github/copilot-instructions.md", "created .codeward/config.yml"]
  },
  {
    id: "check",
    label: "Check PR",
    command: "pnpm codeward check --root . --fail-on error",
    output: ["risk: medium", "1 high finding", "1 review finding", "3 checks good"]
  },
  {
    id: "ci",
    label: "CI Report",
    command: "pnpm codeward ci --root . --fail-on error",
    output: ["annotations: 2", "fail-on: error", "summary written to job log"]
  }
];

export const statusIcon = {
  good: CheckCircle2,
  review: AlertTriangle,
  high: AlertTriangle
} satisfies Record<RiskState, ComponentType<{ className?: string }>>;

export { Folder, TerminalSquare };
