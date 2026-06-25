import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ignoredDirs = new Set([".cache", ".git", ".next", "coverage", "dist", "node_modules"]);
const textExtensions = new Set([".json", ".md", ".ts", ".tsx", ".yaml", ".yml"]);
const root = process.cwd();
const failures = [];

await walk(root);

if (failures.length) {
  console.error("Format check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirs.has(entry.name)) {
      continue;
    }
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(absolutePath);
      continue;
    }
    if (!entry.isFile() || !textExtensions.has(path.extname(entry.name))) {
      continue;
    }
    await checkFile(absolutePath);
  }
}

async function checkFile(absolutePath) {
  const fileStat = await stat(absolutePath);
  if (fileStat.size > 500_000) {
    return;
  }
  const text = await readFile(absolutePath, "utf8");
  const relativePath = path.relative(root, absolutePath);
  if (text.includes("\r\n")) {
    failures.push(`${relativePath} uses CRLF line endings`);
  }
  if (!text.endsWith("\n")) {
    failures.push(`${relativePath} is missing a trailing newline`);
  }
  if (text.endsWith("\n\n")) {
    failures.push(`${relativePath} has an extra blank line at EOF`);
  }
}
