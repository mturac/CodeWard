import path from "node:path";
import {
  type CodeWardConfig,
  type RepoMap,
  listRepoFiles,
  matchesAnyPattern,
  readJsonFile,
  readSmallTextFile
} from "@codeward/core";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
}

const CONFIG_PATTERNS = [
  "biome.json",
  "eslint.config.js",
  "next.config.js",
  "next.config.mjs",
  "package.json",
  "tsconfig.json",
  "vite.config.ts"
];

const IGNORED_PACKAGE_DIRS = ["examples/", "node_modules/", "dist/"];
const CI_PROVIDED_ENV_NAMES = new Set(["CI", "GITHUB_BASE_REF", "GITHUB_EVENT_NAME", "GITHUB_SHA"]);

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".cts",
  ".env",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml"
]);

export async function scanRepository(
  root: string,
  config: CodeWardConfig
): Promise<RepoMap> {
  const files = await listRepoFiles(root);
  const packageJson = await readJsonFile<PackageJson>(path.join(root, "package.json"));
  const workspacePackageJsons = await readWorkspacePackageJsons(root, files);
  const envUsed = await detectEnvUsed(root, files);
  const envExample = await detectEnvExample(root);
  const paths = detectImportantPaths(files, config);
  const frameworks = detectFrameworks(files, [packageJson, ...workspacePackageJsons].filter(isPackageJson));
  const languages = detectLanguages(files);

  return {
    root,
    generatedAt: new Date().toISOString(),
    projectName: config.project.name ?? packageJson?.name ?? path.basename(root),
    packageManager: detectPackageManager(files, packageJson),
    frameworks,
    languages,
    scripts: packageJson?.scripts ?? {},
    env: {
      used: envUsed,
      example: envExample,
      missingFromExample: envUsed.filter((name) => !envExample.includes(name))
    },
    paths,
    packageFiles: files.filter((file) => isPackageFile(file)),
    configFiles: files.filter((file) => CONFIG_PATTERNS.includes(path.basename(file)))
  };
}

export async function rankRelevantFiles(root: string, issueText: string): Promise<string[]> {
  const files = await listRepoFiles(root);
  const terms = tokenize(issueText);
  const scored = files
    .filter((file) => isSourceLike(file))
    .map((file) => ({
      file,
      score: scoreFile(file, terms)
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.file.localeCompare(right.file));

  return scored.slice(0, 10).map((entry) => entry.file);
}

function detectPackageManager(files: string[], packageJson?: PackageJson): RepoMap["packageManager"] {
  const declared = packageJson?.packageManager?.split("@")[0];
  if (declared === "pnpm" || declared === "npm" || declared === "yarn" || declared === "bun") {
    return declared;
  }
  if (files.includes("pnpm-lock.yaml")) {
    return "pnpm";
  }
  if (files.includes("package-lock.json")) {
    return "npm";
  }
  if (files.includes("yarn.lock")) {
    return "yarn";
  }
  if (files.includes("bun.lockb")) {
    return "bun";
  }
  return "unknown";
}

function detectFrameworks(files: string[], packageJsons: PackageJson[]): string[] {
  const dependencies = packageJsons.reduce<Record<string, string>>(
    (allDependencies, packageJson) => ({
      ...allDependencies,
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }),
    {}
  );
  const frameworks = new Set<string>();

  if (dependencies.next || files.some((file) => file.startsWith("app/") || file.startsWith("src/app/"))) {
    frameworks.add("nextjs");
  }
  if (dependencies.react) {
    frameworks.add("react");
  }
  if (dependencies.vite || files.some((file) => path.basename(file).startsWith("vite.config."))) {
    frameworks.add("vite");
  }
  if (dependencies.prisma || dependencies["@prisma/client"] || files.includes("prisma/schema.prisma")) {
    frameworks.add("prisma");
  }
  if (dependencies.express || dependencies.fastify || dependencies.hono) {
    frameworks.add("node-api");
  }
  if (files.some((file) => file.endsWith(".ts") || file.endsWith(".tsx"))) {
    frameworks.add("typescript");
  }

  return [...frameworks].sort();
}

function detectLanguages(files: string[]): string[] {
  const languages = new Set<string>();
  for (const file of files) {
    if (file.endsWith(".ts") || file.endsWith(".tsx")) {
      languages.add("typescript");
    }
    if (file.endsWith(".js") || file.endsWith(".jsx") || file.endsWith(".mjs") || file.endsWith(".cjs")) {
      languages.add("javascript");
    }
    if (file.endsWith(".go")) {
      languages.add("go");
    }
    if (file.endsWith(".py")) {
      languages.add("python");
    }
  }
  return [...languages].sort();
}

async function detectEnvUsed(root: string, files: string[]): Promise<string[]> {
  const names = new Set<string>();
  const envRegexes = [
    /process\.env\.([A-Z][A-Z0-9_]*)/g,
    /process\.env\[['"]([A-Z][A-Z0-9_]*)['"]\]/g,
    /import\.meta\.env\.([A-Z][A-Z0-9_]*)/g
  ];

  for (const file of files.filter(
    (candidate) => isTextFile(candidate) && !candidate.startsWith("examples/") && !isTestFile(candidate)
  )) {
    const text = await readSmallTextFile(root, file);
    if (!text) {
      continue;
    }
    for (const regex of envRegexes) {
      for (const match of text.matchAll(regex)) {
        if (match[1]) {
          names.add(match[1]);
        }
      }
    }
  }

  return [...names].filter((name) => !CI_PROVIDED_ENV_NAMES.has(name)).sort();
}

async function detectEnvExample(root: string): Promise<string[]> {
  const text = await readSmallTextFile(root, ".env.example");
  if (!text) {
    return [];
  }
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => line.split("=")[0]?.trim())
    .filter((name): name is string => Boolean(name))
    .sort();
}

function detectImportantPaths(files: string[], config: CodeWardConfig): RepoMap["paths"] {
  return {
    auth: files.filter((file) => /(^|\/)(auth|session|middleware)\b/i.test(file)),
    database: files.filter((file) => file.startsWith("prisma/") || /(^|\/)(db|database)\b/i.test(file)),
    routes: files.filter(
      (file) =>
        /(^|\/)app\/api\/.*\/route\.(ts|js)$/.test(file) ||
        /(^|\/)pages\/api\/.*\.(ts|js)$/.test(file) ||
        /(^|\/)routes\/.*\.(ts|js)$/.test(file)
    ),
    risky: files.filter((file) => matchesAnyPattern(file, config.risk.high)),
    tests: files.filter((file) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file))
  };
}

function isPackageFile(file: string): boolean {
  return (
    file === "package.json" ||
    file.endsWith("/package.json") ||
    file === "pnpm-lock.yaml" ||
    file === "package-lock.json" ||
    file === "yarn.lock" ||
    file === "bun.lockb"
  );
}

async function readWorkspacePackageJsons(root: string, files: string[]): Promise<PackageJson[]> {
  const packageJsons: PackageJson[] = [];
  for (const file of files.filter(isWorkspacePackageJson)) {
    const packageJson = await readJsonFile<PackageJson>(path.join(root, file));
    if (packageJson) {
      packageJsons.push(packageJson);
    }
  }
  return packageJsons;
}

function isWorkspacePackageJson(file: string): boolean {
  if (!file.endsWith("/package.json")) {
    return false;
  }
  return !IGNORED_PACKAGE_DIRS.some((ignored) => file.startsWith(ignored));
}

function isPackageJson(packageJson: PackageJson | undefined): packageJson is PackageJson {
  return Boolean(packageJson);
}

function isTextFile(file: string): boolean {
  return TEXT_EXTENSIONS.has(path.extname(file)) || path.basename(file).startsWith(".env");
}

function isSourceLike(file: string): boolean {
  return /\.(ts|tsx|js|jsx|md|yml|yaml|json)$/.test(file) && !file.includes("/dist/");
}

function isTestFile(file: string): boolean {
  return /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(file) || /(^|\/)__tests__\//.test(file);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 2);
}

function scoreFile(file: string, terms: string[]): number {
  const normalized = file.toLowerCase();
  return terms.reduce((score, term) => {
    if (normalized.includes(term)) {
      return score + (normalized.endsWith(`${term}.ts`) ? 4 : 1);
    }
    return score;
  }, 0);
}
