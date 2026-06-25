import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import {
  formatPackageScriptCommand,
  getGitChangedFiles,
  listRepoFiles,
  mergeConfig,
  resolveRepoWritePath
} from "./index.js";

describe("mergeConfig", () => {
  it("rejects invalid rule levels and unsafe instruction output paths", () => {
    assert.throws(
      () =>
        mergeConfig({
          rules: {
            missingNearbyTest: "critical"
          } as never
        }),
      /rules must be a map/
    );

    assert.throws(
      () =>
        mergeConfig({
          agents: {
            output: "../AGENTS.md"
          } as never
        }),
      /agents\.output must stay inside/
    );
  });
});

describe("resolveRepoWritePath", () => {
  it("rejects parent traversal and symlink escapes", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codeward-core-root-"));
    const outside = await mkdtemp(path.join(tmpdir(), "codeward-core-outside-"));
    try {
      await mkdir(path.join(root, "safe"), { recursive: true });
      await symlink(outside, path.join(root, "safe", "outside-link"), "dir");

      await assert.rejects(() => resolveRepoWritePath(root, "../outside.txt"), /must stay inside/);
      await assert.rejects(
        () => resolveRepoWritePath(root, "safe/outside-link/file.txt"),
        /must not traverse a symlink/
      );
    } finally {
      await rm(root, { force: true, recursive: true });
      await rm(outside, { force: true, recursive: true });
    }
  });
});

describe("formatPackageScriptCommand", () => {
  it("formats script invocations for common package managers", () => {
    assert.equal(formatPackageScriptCommand("pnpm", "lint"), "pnpm lint");
    assert.equal(formatPackageScriptCommand("npm", "lint"), "npm run lint");
    assert.equal(formatPackageScriptCommand("bun", "lint"), "bun run lint");
    assert.equal(formatPackageScriptCommand("yarn", "lint"), "yarn lint");
    assert.equal(formatPackageScriptCommand("unknown", "lint"), "npm run lint");
  });
});

describe("getGitChangedFiles", () => {
  it("rejects unsafe base refs before invoking git", async () => {
    await assert.rejects(() => getGitChangedFiles(process.cwd(), "--output=/tmp/file"), /Git base ref/);
    await assert.rejects(() => getGitChangedFiles(process.cwd(), "origin/main --stat"), /Git base ref/);
  });
});

describe("listRepoFiles", () => {
  it("skips local generated tool output directories", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codeward-core-files-"));
    try {
      await mkdir(path.join(root, ".izonconsule"), { recursive: true });
      await mkdir(path.join(root, ".playwright-cli"), { recursive: true });
      await mkdir(path.join(root, "src"), { recursive: true });
      await writeFile(path.join(root, ".izonconsule", "audit.md"), "process.env.SECRET_TOKEN\n");
      await writeFile(path.join(root, ".playwright-cli", "trace.json"), "{}\n");
      await writeFile(path.join(root, "src", "index.ts"), "export const ok = true;\n");

      assert.deepEqual(await listRepoFiles(root), ["src/index.ts"]);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
