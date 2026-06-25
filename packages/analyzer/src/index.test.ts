import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { DEFAULT_CONFIG } from "@codeward/core";
import { scanRepository } from "./index.js";

describe("scanRepository", () => {
  it("detects TypeScript SaaS project signals", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codeward-analyzer-"));
    try {
      await writeFile(
        path.join(root, "package.json"),
        JSON.stringify(
          {
            name: "fixture-app",
            packageManager: "pnpm@11.8.0",
            dependencies: {
              "@prisma/client": "^6.0.0",
              next: "^15.0.0",
              react: "^19.0.0"
            },
            scripts: {
              build: "next build",
              test: "vitest run"
            }
          },
          null,
          2
        )
      );
      await writeFile(path.join(root, ".env.example"), "DATABASE_URL=\n");
      await writeFile(path.join(root, "route.ts"), "export const runtime = 'nodejs';\n");
      await writeFile(path.join(root, "billing.ts"), "const url = process.env.DATABASE_URL;\n");

      const repoMap = await scanRepository(root, DEFAULT_CONFIG);

      assert.equal(repoMap.packageManager, "pnpm");
      assert.ok(repoMap.frameworks.includes("nextjs"));
      assert.ok(repoMap.frameworks.includes("prisma"));
      assert.ok(repoMap.frameworks.includes("react"));
      assert.ok(repoMap.frameworks.includes("typescript"));
      assert.ok(repoMap.env.used.includes("DATABASE_URL"));
      assert.deepEqual(repoMap.env.missingFromExample, []);
      assert.equal(repoMap.scripts.test, "vitest run");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
