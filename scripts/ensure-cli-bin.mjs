import { chmod } from "node:fs/promises";

await chmod(new URL("../apps/cli/dist/index.js", import.meta.url), 0o755).catch(() => {
  // Build may not have reached the CLI yet; the TypeScript error will be reported separately.
});
