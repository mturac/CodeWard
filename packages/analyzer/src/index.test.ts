import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
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
      await writeFile(
        path.join(root, "billing.ts"),
        "const url = process.env.DATABASE_URL;\nconst base = process.env.GITHUB_BASE_REF;\n"
      );

      const repoMap = await scanRepository(root, DEFAULT_CONFIG);

      assert.equal(repoMap.packageManager, "pnpm");
      assert.ok(repoMap.frameworks.includes("nextjs"));
      assert.ok(repoMap.frameworks.includes("prisma"));
      assert.ok(repoMap.frameworks.includes("react"));
      assert.ok(repoMap.frameworks.includes("typescript"));
      assert.ok(repoMap.env.used.includes("DATABASE_URL"));
      assert.equal(repoMap.env.used.includes("GITHUB_BASE_REF"), false);
      assert.deepEqual(repoMap.env.missingFromExample, []);
      assert.equal(repoMap.scripts.test, "vitest run");
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });

  it("detects nested workspace packages and Vite config files", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "codeward-analyzer-"));
    try {
      await mkdir(path.join(root, "apps", "web", "src"), { recursive: true });
      await writeFile(
        path.join(root, "package.json"),
        JSON.stringify(
          {
            name: "fixture-monorepo",
            packageManager: "npm@10.0.0",
            scripts: {
              lint: "eslint ."
            }
          },
          null,
          2
        )
      );
      await writeFile(
        path.join(root, "apps", "web", "package.json"),
        JSON.stringify(
          {
            name: "web",
            dependencies: {
              react: "^19.0.0"
            },
            devDependencies: {
              vite: "^7.0.0"
            }
          },
          null,
          2
        )
      );
      await writeFile(path.join(root, "apps", "web", "vite.config.ts"), "export default {};\n");
      await writeFile(path.join(root, "apps", "web", "src", "main.tsx"), "export const app = true;\n");

      const repoMap = await scanRepository(root, DEFAULT_CONFIG);

      assert.equal(repoMap.packageManager, "npm");
      assert.ok(repoMap.frameworks.includes("react"));
      assert.ok(repoMap.frameworks.includes("vite"));
      assert.ok(repoMap.frameworks.includes("typescript"));
      assert.ok(repoMap.packageFiles.includes("apps/web/package.json"));
      assert.ok(repoMap.configFiles.includes("apps/web/vite.config.ts"));
    } finally {
      await rm(root, { force: true, recursive: true });
    }
  });
});
