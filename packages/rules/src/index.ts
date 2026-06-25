import path from "node:path";
import {
  type CheckResult,
  type CodeWardConfig,
  type Finding,
  type RepoMap,
  type RuleLevel,
  getInstructionOutputPath,
  getInstructionTargets,
  matchesAnyPattern,
  pathExists,
  readSmallTextFile,
  riskFromFindings,
  severityRank
} from "@codeward/core";

export interface RuleContext {
  changedFiles: string[];
  config: CodeWardConfig;
  repoMap: RepoMap;
  root: string;
}

export interface Rule {
  id: string;
  defaultLevel: Exclude<RuleLevel, "off">;
  run(context: RuleContext, severity: Exclude<RuleLevel, "off">): Promise<Finding[]>;
}

const RULES: Rule[] = [
  {
    id: "requireAgentsMd",
    defaultLevel: "error",
    async run(context, severity) {
      const findings: Finding[] = [];
      for (const target of getInstructionTargets(context.config)) {
        const output = getInstructionOutputPath(context.config, target);
        if (await pathExists(path.join(context.root, output))) {
          continue;
        }
        findings.push({
          ruleId: "requireAgentsMd",
          severity,
          title: "Instruction file is missing",
          message: `Code agents do not have repository-specific ${target} instructions at ${output}.`,
          suggestion: "Run `codeward agents --write` or `codeward init`."
        });
      }
      return findings;
    }
  },
  {
    id: "envExampleSync",
    defaultLevel: "error",
    async run(context, severity) {
      if (!context.repoMap.env.missingFromExample.length) {
        return [];
      }
      return [
        {
          ruleId: "envExampleSync",
          severity,
          title: "Environment example is incomplete",
          message: `Detected environment variables missing from .env.example: ${context.repoMap.env.missingFromExample.join(", ")}.`,
          path: ".env.example",
          suggestion: "Document required variables in .env.example without committing secret values."
        }
      ];
    }
  },
  {
    id: "dependencyChange",
    defaultLevel: "warn",
    async run(context, severity) {
      return context.changedFiles
        .filter((file) => /(^|\/)(package\.json|pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb)$/.test(file))
        .map((file) => ({
          ruleId: "dependencyChange",
          severity,
          title: "Dependency surface changed",
          message: `${file} changed. Dependency changes should be intentional and reviewed.`,
          path: file,
          suggestion: "Explain why the dependency or lockfile changed and run the package manager install/test flow."
        }));
    }
  },
  {
    id: "riskyFileChange",
    defaultLevel: "warn",
    async run(context, severity) {
      return context.changedFiles
        .filter((file) => matchesAnyPattern(file, context.config.risk.high))
        .map((file) => ({
          ruleId: "riskyFileChange",
          severity,
          title: "High-risk path changed",
          message: `${file} matches a high-risk CodeWard path.`,
          path: file,
          suggestion: "Confirm focused tests and human review for this path."
        }));
    }
  },
  {
    id: "missingNearbyTest",
    defaultLevel: "warn",
    async run(context, severity) {
      const findings: Finding[] = [];
      for (const file of context.changedFiles.filter(isLogicSourceFile)) {
        if (await hasNearbyTest(context.root, file)) {
          continue;
        }
        findings.push({
          ruleId: "missingNearbyTest",
          severity,
          title: "Logic changed without a nearby test",
          message: `${file} changed but CodeWard did not find a nearby test file.`,
          path: file,
          suggestion: "Add or update a focused regression test, or document why this change is safely covered elsewhere."
        });
      }
      return findings;
    }
  },
  {
    id: "forbiddenAny",
    defaultLevel: "warn",
    async run(context, severity) {
      const findings: Finding[] = [];
      for (const file of context.changedFiles.filter((candidate) => /\.(ts|tsx)$/.test(candidate))) {
        const text = await readSmallTextFile(context.root, file);
        if (!text) {
          continue;
        }
        if (explicitAnyPattern().test(text)) {
          findings.push({
            ruleId: "forbiddenAny",
            severity,
            title: "Explicit any detected",
            message: `${file} contains an explicit any type.`,
            path: file,
            suggestion: "Use explicit types, generics, or `unknown` with validation at untrusted boundaries."
          });
        }
      }
      return findings;
    }
  },
  {
    id: "silentCatch",
    defaultLevel: "error",
    async run(context, severity) {
      const findings: Finding[] = [];
      for (const file of context.changedFiles.filter((candidate) => /\.(ts|tsx|js|jsx)$/.test(candidate))) {
        const text = await readSmallTextFile(context.root, file);
        if (!text) {
          continue;
        }
        if (/catch\s*(?:\([^)]*\))?\s*{\s*(?:\/\/[^\n]*\n\s*)?}/m.test(text)) {
          findings.push({
            ruleId: "silentCatch",
            severity,
            title: "Silent catch block detected",
            message: `${file} contains an empty catch block.`,
            path: file,
            suggestion: "Handle the error, return a typed failure, or add a short comment explaining why it is safe to ignore."
          });
        }
      }
      return findings;
    }
  }
];

export async function runRules(context: RuleContext): Promise<CheckResult> {
  const findings: Finding[] = [];

  for (const rule of RULES) {
    const configuredLevel = context.config.rules[rule.id] ?? rule.defaultLevel;
    if (configuredLevel === "off") {
      continue;
    }
    findings.push(...(await rule.run(context, configuredLevel)));
  }

  findings.sort(
    (left, right) =>
      severityRank(right.severity) - severityRank(left.severity) ||
      left.ruleId.localeCompare(right.ruleId) ||
      (left.path ?? "").localeCompare(right.path ?? "")
  );

  return {
    risk: riskFromFindings(findings),
    findings,
    changedFiles: context.changedFiles,
    validationCommands: context.config.validation.commands
  };
}

function explicitAnyPattern(): RegExp {
  const token = "any";
  return new RegExp(`(\\bas\\s+${token}\\b|:\\s*${token}\\b|<${token}>)`);
}

export function shouldFail(result: CheckResult, failOn: RuleLevel): boolean {
  if (failOn === "off") {
    return false;
  }
  return result.findings.some((finding) => severityRank(finding.severity) >= severityRank(failOn));
}

function isLogicSourceFile(file: string): boolean {
  if (!/\.(ts|tsx|js|jsx)$/.test(file)) {
    return false;
  }
  if (isTestFile(file)) {
    return false;
  }
  return !/(^|\/)(config|dist|coverage|node_modules)\//.test(file);
}

function isTestFile(file: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file) || /(^|\/)__tests__\//.test(file);
}

async function hasNearbyTest(root: string, file: string): Promise<boolean> {
  const extension = path.extname(file);
  const base = file.slice(0, -extension.length);
  const candidates = [
    `${base}.test${extension}`,
    `${base}.spec${extension}`,
    path.join(path.dirname(file), "__tests__", `${path.basename(base)}.test${extension}`)
  ];
  for (const candidate of candidates) {
    if (await pathExists(path.join(root, candidate))) {
      return true;
    }
  }
  return false;
}
