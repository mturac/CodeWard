import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_CONFIG, type RepoMap } from "@codeward/core";
import { generateAgentsMd, generateInstructionFiles } from "./index.js";

describe("generateAgentsMd", () => {
  it("generates repo-aware instructions", () => {
    const repoMap: RepoMap = {
      root: "/tmp/app",
      generatedAt: "2026-06-25T00:00:00.000Z",
      projectName: "fixture-app",
      packageManager: "pnpm",
      frameworks: ["nextjs", "prisma", "typescript"],
      languages: ["typescript"],
      scripts: { test: "vitest run" },
      env: {
        used: ["DATABASE_URL"],
        example: [],
        missingFromExample: ["DATABASE_URL"]
      },
      paths: {
        auth: ["src/server/auth/session.ts"],
        database: ["prisma/schema.prisma"],
        risky: ["src/app/api/projects/route.ts"],
        routes: ["src/app/api/projects/route.ts"],
        tests: []
      },
      packageFiles: ["package.json"],
      configFiles: ["package.json", "tsconfig.json"]
    };

    const output = generateAgentsMd(repoMap, {
      ...DEFAULT_CONFIG,
      validation: { commands: { test: "pnpm test" } }
    });

    assert.match(output, /# fixture-app Agent Instructions/);
    assert.match(output, /Next\.js server actions and API routes must validate the session/);
    assert.match(output, /Prisma access must stay on the server side/);
    assert.match(output, /DATABASE_URL/);
  });

  it("generates configured instruction targets from one repo map", () => {
    const repoMap = fixtureRepoMap();
    const files = generateInstructionFiles(repoMap, {
      ...DEFAULT_CONFIG,
      validation: { commands: { test: "pnpm test" } }
    });

    assert.deepEqual(
      files.map((file) => file.path),
      ["AGENTS.md", ".github/copilot-instructions.md"]
    );
    assert.match(files[0]?.contents ?? "", /# fixture-app Agent Instructions/);
    assert.match(files[1]?.contents ?? "", /# fixture-app Copilot Instructions/);
    assert.match(files[1]?.contents ?? "", /Prioritize production risks/);
  });

  it("formats inferred npm validation scripts with npm run", () => {
    const output = generateAgentsMd(
      {
        ...fixtureRepoMap(),
        packageManager: "npm",
        scripts: {
          lint: "eslint .",
          test: "node --test"
        }
      },
      DEFAULT_CONFIG
    );

    assert.match(output, /Validation commands: npm run lint; npm run test/);
    assert.match(output, /- lint: `npm run lint`/);
    assert.doesNotMatch(output, /npm lint/);
  });
});

function fixtureRepoMap(): RepoMap {
  return {
    root: "/tmp/app",
    generatedAt: "2026-06-25T00:00:00.000Z",
    projectName: "fixture-app",
    packageManager: "pnpm",
    frameworks: ["nextjs", "prisma", "typescript"],
    languages: ["typescript"],
    scripts: { test: "vitest run" },
    env: {
      used: ["DATABASE_URL"],
      example: [],
      missingFromExample: ["DATABASE_URL"]
    },
    paths: {
      auth: ["src/server/auth/session.ts"],
      database: ["prisma/schema.prisma"],
      risky: ["src/app/api/projects/route.ts"],
      routes: ["src/app/api/projects/route.ts"],
      tests: []
    },
    packageFiles: ["package.json"],
    configFiles: ["package.json", "tsconfig.json"]
  };
}
