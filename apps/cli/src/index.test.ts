import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";

const cliPath = new URL("./index.js", import.meta.url);

describe("codeward cli", () => {
  it("generates safe repo-local init files and workflow", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codeward-cli-"));
    try {
      await writeFile(
        path.join(root, "package.json"),
        JSON.stringify(
          {
            name: "fixture",
            packageManager: "pnpm@11.8.0",
            scripts: {
              test: "node --test"
            }
          },
          null,
          2
        )
      );

      const result = runCli("init", "--root", root, "--target", "agents", "--force");
      assert.equal(result.status, 0, result.stderr);

      const agents = await readFile(path.join(root, "AGENTS.md"), "utf8");
      const workflow = await readFile(path.join(root, ".github", "workflows", "codeward.yml"), "utf8");
      assert.match(agents, /# fixture Agent Instructions/);
      assert.match(workflow, /uses: mturac\/CodeWard@main/);
      assert.match(workflow, /base: \$\{\{ github\.event\.pull_request\.base\.sha \}\}/);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("rejects config output paths outside the repository", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codeward-cli-"));
    try {
      await mkdir(path.join(root, ".codeward"), { recursive: true });
      await writeFile(path.join(root, "package.json"), JSON.stringify({ name: "fixture" }, null, 2));
      await writeFile(path.join(root, ".codeward", "config.yml"), "agents:\n  output: ../AGENTS.md\n");

      const result = runCli("agents", "--root", root, "--write");
      assert.equal(result.status, 1);
      assert.match(result.stderr, /agents\.output must stay inside/);
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});

function runCli(...args: string[]): { status: number | null; stderr: string; stdout: string } {
  const result = spawnSync(process.execPath, [cliPath.pathname, ...args], {
    encoding: "utf8"
  });
  return {
    status: result.status,
    stderr: result.stderr,
    stdout: result.stdout
  };
}
