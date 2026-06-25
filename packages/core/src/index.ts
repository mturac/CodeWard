import { execFile } from "node:child_process";
import { access, lstat, mkdir, readdir, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import YAML from "yaml";

const execFileAsync = promisify(execFile);

export type RuleLevel = "off" | "info" | "warn" | "error";
export type RiskLevel = "low" | "medium" | "high";
export type InstructionTarget = "agents" | "copilot";

export const COPILOT_INSTRUCTIONS_PATH = ".github/copilot-instructions.md";

export interface CodeWardConfig {
  project: {
    name?: string;
    stack: string[];
  };
  validation: {
    commands: Record<string, string>;
  };
  risk: {
    high: string[];
    generated: string[];
  };
  rules: Record<string, RuleLevel>;
  agents: {
    output: string;
    style: "balanced" | "strict";
    targets: InstructionTarget[];
  };
}

export interface RepoMap {
  root: string;
  generatedAt: string;
  projectName: string;
  packageManager: "bun" | "npm" | "pnpm" | "unknown" | "yarn";
  frameworks: string[];
  languages: string[];
  scripts: Record<string, string>;
  env: {
    used: string[];
    example: string[];
    missingFromExample: string[];
  };
  paths: {
    auth: string[];
    database: string[];
    routes: string[];
    risky: string[];
    tests: string[];
  };
  packageFiles: string[];
  configFiles: string[];
}

export interface Finding {
  ruleId: string;
  severity: Exclude<RuleLevel, "off">;
  title: string;
  message: string;
  path?: string;
  suggestion?: string;
}

export interface CheckResult {
  risk: RiskLevel;
  findings: Finding[];
  changedFiles: string[];
  validationCommands: Record<string, string>;
}

export const DEFAULT_CONFIG: CodeWardConfig = {
  project: {
    stack: []
  },
  validation: {
    commands: {}
  },
  risk: {
    generated: ["dist/**", "coverage/**", ".next/**", "*.tsbuildinfo"],
    high: [
      "package.json",
      "pnpm-lock.yaml",
      "package-lock.json",
      "yarn.lock",
      "bun.lockb",
      ".github/workflows/**",
      "prisma/**",
      "src/server/auth/**",
      "src/server/billing/**",
      "src/app/api/**"
    ]
  },
  rules: {
    dependencyChange: "warn",
    envExampleSync: "error",
    forbiddenAny: "warn",
    missingNearbyTest: "warn",
    requireAgentsMd: "error",
    riskyFileChange: "warn",
    silentCatch: "error"
  },
  agents: {
    output: "AGENTS.md",
    style: "strict",
    targets: ["agents", "copilot"]
  }
};

const IGNORED_DIRS = new Set([
  ".cache",
  ".git",
  ".next",
  ".izonconsule",
  ".playwright-cli",
  ".turbo",
  ".vercel",
  "coverage",
  "dist",
  "node_modules"
]);

export function resolveRoot(root?: string): string {
  return path.resolve(root ?? process.cwd());
}

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readTextFile(filePath: string): Promise<string | undefined> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }
    throw error;
  }
}

export async function readJsonFile<T>(filePath: string): Promise<T | undefined> {
  const text = await readTextFile(filePath);
  if (!text) {
    return undefined;
  }
  return JSON.parse(text) as T;
}

export async function writeTextFile(filePath: string, contents: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
}

export async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  await writeTextFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function loadConfig(root: string): Promise<CodeWardConfig> {
  const configPath = path.join(root, ".codeward", "config.yml");
  const text = await readTextFile(configPath);
  if (!text) {
    return DEFAULT_CONFIG;
  }
  const parsed = YAML.parse(text) as Partial<CodeWardConfig> | null;
  return mergeConfig(parsed ?? {});
}

export function serializeConfig(config: CodeWardConfig): string {
  return YAML.stringify(config);
}

export function mergeConfig(config: Partial<CodeWardConfig>): CodeWardConfig {
  validateConfigShape(config);
  return {
    project: {
      ...DEFAULT_CONFIG.project,
      ...config.project,
      stack: config.project?.stack ?? DEFAULT_CONFIG.project.stack
    },
    validation: {
      commands: {
        ...DEFAULT_CONFIG.validation.commands,
        ...config.validation?.commands
      }
    },
    risk: {
      generated: config.risk?.generated ?? DEFAULT_CONFIG.risk.generated,
      high: config.risk?.high ?? DEFAULT_CONFIG.risk.high
    },
    rules: {
      ...DEFAULT_CONFIG.rules,
      ...config.rules
    },
    agents: {
      ...DEFAULT_CONFIG.agents,
      ...config.agents,
      output: config.agents?.output ? assertRepoRelativePath(config.agents.output, "agents.output") : DEFAULT_CONFIG.agents.output,
      targets: normalizeInstructionTargets(config.agents?.targets)
    }
  };
}

export function getInstructionOutputPath(config: CodeWardConfig, target: InstructionTarget): string {
  return target === "agents" ? config.agents.output : COPILOT_INSTRUCTIONS_PATH;
}

export function getInstructionTargets(config: CodeWardConfig): InstructionTarget[] {
  return normalizeInstructionTargets(config.agents.targets);
}

export function normalizeInstructionTargets(targets?: readonly string[]): InstructionTarget[] {
  const normalized: InstructionTarget[] = [];
  for (const target of targets ?? DEFAULT_CONFIG.agents.targets) {
    if ((target === "agents" || target === "copilot") && !normalized.includes(target)) {
      normalized.push(target);
    }
  }
  return normalized.length ? normalized : DEFAULT_CONFIG.agents.targets;
}

export async function listRepoFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(dir, entry.name);
      const relativePath = normalizePath(path.relative(root, absolutePath));

      if (entry.isDirectory()) {
        await walk(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  await walk(root);
  return files.sort();
}

export async function readSmallTextFile(root: string, relativePath: string): Promise<string | undefined> {
  const absolutePath = resolveRepoPath(root, relativePath);
  const fileStat = await stat(absolutePath).catch(() => undefined);
  if (!fileStat || fileStat.size > 300_000) {
    return undefined;
  }
  return readTextFile(absolutePath);
}

export async function getGitChangedFiles(root: string, base?: string): Promise<string[]> {
  const changed = new Set<string>();
  const normalizedBase = base ? assertSafeGitBase(base) : undefined;

  const runs = normalizedBase
    ? [["diff", "--name-only", `${normalizedBase}...HEAD`]]
    : [
        ["diff", "--name-only"],
        ["diff", "--name-only", "--cached"],
        ["ls-files", "--others", "--exclude-standard"]
      ];

  for (const args of runs) {
    try {
      const { stdout } = await execFileAsync("git", args, { cwd: root, timeout: 5000 });
      for (const line of stdout.split("\n")) {
        const trimmed = normalizePath(line.trim());
        if (trimmed) {
          changed.add(trimmed);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Unable to determine changed files with git ${args.join(" ")}: ${message}`);
    }
  }

  return [...changed].sort();
}

function assertSafeGitBase(base: string): string {
  const trimmed = base.trim();
  if (!trimmed || trimmed.startsWith("-") || /\s/.test(trimmed)) {
    throw new Error("Git base ref must be a non-empty ref or SHA, not an option or whitespace-separated value.");
  }
  return trimmed;
}

export function normalizePath(filePath: string): string {
  return filePath.replaceAll(path.sep, "/");
}

export function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  const normalized = normalizePath(filePath);
  return patterns.some((pattern) => globToRegExp(pattern).test(normalized));
}

export function assertRepoRelativePath(relativePath: string, label = "path"): string {
  const trimmed = relativePath.trim();
  const normalized = normalizePath(trimmed);
  if (!normalized || normalized === "." || path.isAbsolute(trimmed)) {
    throw new Error(`${label} must be a repository-relative path.`);
  }
  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../") || normalized.endsWith("/..")) {
    throw new Error(`${label} must stay inside the repository.`);
  }
  return normalized;
}

export function resolveRepoPath(root: string, relativePath: string, label = "path"): string {
  const normalized = assertRepoRelativePath(relativePath, label);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, normalized);
  const fromRoot = path.relative(resolvedRoot, resolvedPath);
  if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
    throw new Error(`${label} must stay inside the repository.`);
  }
  return resolvedPath;
}

export async function resolveRepoWritePath(root: string, relativePath: string, label = "path"): Promise<string> {
  const normalized = assertRepoRelativePath(relativePath, label);
  const resolvedPath = resolveRepoPath(root, normalized, label);
  const rootRealPath = await realpath(root);
  await assertExistingSegmentsStayInsideRoot(root, rootRealPath, normalized, label);
  return resolvedPath;
}

export function formatPackageScriptCommand(packageManager: RepoMap["packageManager"], script: string): string {
  if (packageManager === "pnpm") {
    return `pnpm ${script}`;
  }
  if (packageManager === "yarn") {
    return `yarn ${script}`;
  }
  if (packageManager === "bun") {
    return `bun run ${script}`;
  }
  return `npm run ${script}`;
}

export function severityRank(severity: RuleLevel): number {
  switch (severity) {
    case "error":
      return 3;
    case "warn":
      return 2;
    case "info":
      return 1;
    case "off":
      return 0;
  }
}

export function riskFromFindings(findings: Finding[]): RiskLevel {
  if (findings.some((finding) => finding.severity === "error")) {
    return "high";
  }
  if (findings.some((finding) => finding.severity === "warn")) {
    return "medium";
  }
  return "low";
}

function globToRegExp(pattern: string): RegExp {
  const normalized = normalizePath(pattern);
  let expression = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === "*" && next === "*") {
      expression += ".*";
      index += 1;
      continue;
    }

    if (char === "*") {
      expression += "[^/]*";
      continue;
    }

    if (char === "?") {
      expression += ".";
      continue;
    }

    expression += escapeRegExp(char ?? "");
  }

  return new RegExp(`^${expression}$`);
}

async function assertExistingSegmentsStayInsideRoot(
  root: string,
  rootRealPath: string,
  relativePath: string,
  label: string
): Promise<void> {
  const segments = relativePath.split("/");
  let probe = path.resolve(root);
  for (const segment of segments) {
    probe = path.join(probe, segment);
    const segmentStat = await lstat(probe).catch((error: unknown) => {
      if (isNodeError(error) && error.code === "ENOENT") {
        return undefined;
      }
      throw error;
    });
    if (!segmentStat) {
      return;
    }
    if (!segmentStat.isSymbolicLink()) {
      continue;
    }
    const target = await realpath(probe);
    const fromRoot = path.relative(rootRealPath, target);
    if (fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
      throw new Error(`${label} must not traverse a symlink outside the repository.`);
    }
  }
}

function validateConfigShape(config: Partial<CodeWardConfig>): void {
  if (!isRecord(config)) {
    throw new Error("CodeWard config must be an object.");
  }
  if (config.project !== undefined && !isRecord(config.project)) {
    throw new Error("project must be an object.");
  }
  if (config.project?.stack !== undefined && !isStringArray(config.project.stack)) {
    throw new Error("project.stack must be an array of strings.");
  }
  if (config.validation !== undefined && !isRecord(config.validation)) {
    throw new Error("validation must be an object.");
  }
  if (config.validation?.commands !== undefined && !isStringRecord(config.validation.commands)) {
    throw new Error("validation.commands must be a string map.");
  }
  if (config.risk !== undefined && !isRecord(config.risk)) {
    throw new Error("risk must be an object.");
  }
  if (config.risk?.generated !== undefined && !isStringArray(config.risk.generated)) {
    throw new Error("risk.generated must be an array of strings.");
  }
  if (config.risk?.high !== undefined && !isStringArray(config.risk.high)) {
    throw new Error("risk.high must be an array of strings.");
  }
  if (config.rules !== undefined && !isRuleMap(config.rules)) {
    throw new Error("rules must be a map of off, info, warn, or error.");
  }
  if (config.agents !== undefined && !isRecord(config.agents)) {
    throw new Error("agents must be an object.");
  }
  if (config.agents?.output !== undefined && typeof config.agents.output !== "string") {
    throw new Error("agents.output must be a string.");
  }
  if (config.agents?.style !== undefined && config.agents.style !== "balanced" && config.agents.style !== "strict") {
    throw new Error("agents.style must be balanced or strict.");
  }
  if (config.agents?.targets !== undefined && !isInstructionTargets(config.agents.targets)) {
    throw new Error("agents.targets must contain agents and/or copilot.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isRecord(value) && Object.values(value).every((entry) => typeof entry === "string");
}

function isRuleMap(value: unknown): value is Record<string, RuleLevel> {
  return isRecord(value) && Object.values(value).every(isRuleLevel);
}

function isRuleLevel(value: unknown): value is RuleLevel {
  return value === "off" || value === "info" || value === "warn" || value === "error";
}

function isInstructionTargets(value: unknown): value is InstructionTarget[] {
  return Array.isArray(value) && value.every((entry) => entry === "agents" || entry === "copilot");
}

function escapeRegExp(value: string): string {
  return value.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
