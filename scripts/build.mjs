import { chmod } from "node:fs/promises";
import ts from "typescript";

const formatHost = {
  getCanonicalFileName: (fileName) => fileName,
  getCurrentDirectory: () => process.cwd(),
  getNewLine: () => "\n"
};

const host = ts.createSolutionBuilderHost(ts.sys, undefined, (diagnostic) => {
  console.error(ts.formatDiagnostic(diagnostic, formatHost));
});

const builder = ts.createSolutionBuilder(host, ["tsconfig.json"], {
  pretty: false
});

const exitStatus = builder.build();
if (exitStatus !== ts.ExitStatus.Success) {
  process.exitCode = 1;
} else {
  await chmod(new URL("../apps/cli/dist/index.js", import.meta.url), 0o755).catch(() => {
    // TypeScript diagnostics already explain missing output if build failed.
  });
}
