import { readdir } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import "./build.mjs";

if (process.exitCode) {
  process.exit(process.exitCode);
}

const testFiles = (
  await Promise.all([
    findTestFiles(path.resolve("packages")),
    findTestFiles(path.resolve("apps"))
  ])
)
  .flat()
  .sort();

if (!testFiles.length) {
  console.error("No built test files were found.");
  process.exitCode = 1;
} else {
  for (const testFile of testFiles) {
    await import(pathToFileURL(testFile).href);
  }
}

async function findTestFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error?.code === "ENOENT") {
      return [];
    }
    throw error;
  });
  const found = [];
  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...(await findTestFiles(absolutePath)));
      continue;
    }
    if (entry.isFile() && /\/dist\/.*\.test\.js$/.test(absolutePath.replaceAll(path.sep, "/"))) {
      found.push(absolutePath);
    }
  }
  return found;
}
