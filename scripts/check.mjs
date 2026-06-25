import "./test.mjs";

if (process.exitCode) {
  process.exit(process.exitCode);
}

await import("./check-format.mjs");
