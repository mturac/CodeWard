# GitHub Action

CodeWard can run in pull requests through the repository action.

```yaml
name: CodeWard

on:
  pull_request:

permissions:
  contents: read

jobs:
  guardrails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: codeward/codeward-action@v0
```

For local development in this repository, the generated workflow uses `pnpm dlx codeward ci`.

## Failure Mode

By default, `codeward ci` fails on `error` findings. Use `--fail-on warn` for stricter teams or `--fail-on off` while piloting.

## Instruction Files

The generated CodeWard workflow checks the configured instruction targets. By default, `codeward init` creates both `AGENTS.md` and `.github/copilot-instructions.md` so coding agents and GitHub Copilot code review share the same repository policy.
