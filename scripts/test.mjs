import "./build.mjs";

if (process.exitCode) {
  process.exit(process.exitCode);
}

await import("../packages/analyzer/dist/index.test.js");
await import("../packages/agents-md/dist/index.test.js");
await import("../packages/rules/dist/index.test.js");
