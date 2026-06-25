import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { DEFAULT_CONFIG, type RepoMap } from "@codeward/core";
import { runRules, shouldFail } from "./index.js";

describe("runRules", () => {
  it("reports missing agent instructions and env example drift", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codeward-rules-"));
    try {
      const repoMap = baseRepoMap(root, {
        used: ["STRIPE_SECRET_KEY"],
        example: [],
        missingFromExample: ["STRIPE_SECRET_KEY"]
      });

      const result = await runRules({
        root,
        config: DEFAULT_CONFIG,
        repoMap,
        changedFiles: []
      });

      const ruleIds = result.findings.map((finding) => finding.ruleId);
      assert.ok(ruleIds.includes("requireAgentsMd"));
      assert.ok(ruleIds.includes("envExampleSync"));
      assert.equal(result.findings.filter((finding) => finding.ruleId === "requireAgentsMd").length, 2);
      assert.equal(result.risk, "high");
      assert.equal(shouldFail(result, "error"), true);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("flags risky changed files and explicit any", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codeward-rules-"));
    try {
      await mkdir(path.join(root, "src", "server", "billing"), { recursive: true });
      await mkdir(path.join(root, ".github"), { recursive: true });
      await writeFile(path.join(root, "AGENTS.md"), "# Agent rules\n");
      await writeFile(path.join(root, ".github", "copilot-instructions.md"), "# Copilot rules\n");
      await writeFile(path.join(root, "src", "server", "billing", "updatePlan.ts"), "export const x: " + "any = 1;\n");
      const repoMap = baseRepoMap(root);

      const result = await runRules({
        root,
        config: DEFAULT_CONFIG,
        repoMap,
        changedFiles: ["src/server/billing/updatePlan.ts"]
      });

      const ruleIds = result.findings.map((finding) => finding.ruleId);
      assert.ok(ruleIds.includes("riskyFileChange"));
      assert.ok(ruleIds.includes("forbiddenAny"));
      assert.ok(ruleIds.includes("missingNearbyTest"));
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("does not let an unrelated changed test suppress missing nearby test", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codeward-rules-"));
    try {
      await mkdir(path.join(root, "src", "billing"), { recursive: true });
      await mkdir(path.join(root, "src", "auth"), { recursive: true });
      await mkdir(path.join(root, ".github"), { recursive: true });
      await writeFile(path.join(root, "AGENTS.md"), "# Agent rules\n");
      await writeFile(path.join(root, ".github", "copilot-instructions.md"), "# Copilot rules\n");
      await writeFile(path.join(root, "src", "billing", "updatePlan.ts"), "export const updatePlan = () => true;\n");
      await writeFile(path.join(root, "src", "auth", "session.test.ts"), "import 'node:test';\n");

      const result = await runRules({
        root,
        config: DEFAULT_CONFIG,
        repoMap: baseRepoMap(root),
        changedFiles: ["src/billing/updatePlan.ts", "src/auth/session.test.ts"]
      });

      assert.ok(
        result.findings.some(
          (finding) => finding.ruleId === "missingNearbyTest" && finding.path === "src/billing/updatePlan.ts"
        )
      );
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("accepts a nearby changed test for logic changes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codeward-rules-"));
    try {
      await mkdir(path.join(root, "src", "billing"), { recursive: true });
      await mkdir(path.join(root, ".github"), { recursive: true });
      await writeFile(path.join(root, "AGENTS.md"), "# Agent rules\n");
      await writeFile(path.join(root, ".github", "copilot-instructions.md"), "# Copilot rules\n");
      await writeFile(path.join(root, "src", "billing", "updatePlan.ts"), "export const updatePlan = () => true;\n");
      await writeFile(path.join(root, "src", "billing", "updatePlan.test.ts"), "import 'node:test';\n");

      const result = await runRules({
        root,
        config: DEFAULT_CONFIG,
        repoMap: baseRepoMap(root),
        changedFiles: ["src/billing/updatePlan.ts", "src/billing/updatePlan.test.ts"]
      });

      assert.equal(
        result.findings.some(
          (finding) => finding.ruleId === "missingNearbyTest" && finding.path === "src/billing/updatePlan.ts"
        ),
        false
      );
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

function baseRepoMap(root: string, env: RepoMap["env"] = { used: [], example: [], missingFromExample: [] }): RepoMap {
  return {
    root,
    generatedAt: "2026-06-25T00:00:00.000Z",
    projectName: "fixture",
    packageManager: "pnpm",
    frameworks: ["typescript"],
    languages: ["typescript"],
    scripts: {},
    env,
    paths: {
      auth: [],
      database: [],
      risky: [],
      routes: [],
      tests: []
    },
    packageFiles: [],
    configFiles: []
  };
}
