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
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 11.8.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - uses: mturac/CodeWard@main
        with:
          base: ${{ github.event.pull_request.base.sha }}
          fail-on: error
```

The generated workflow calls this repository action directly and passes the pull request base SHA so changed-file checks work in CI.

## Failure Mode

By default, `codeward ci` fails on `error` findings. Use `--fail-on warn` for stricter teams or `--fail-on off` while piloting.

## Instruction Files

The generated CodeWard workflow checks the configured instruction targets. By default, `codeward init` creates both `AGENTS.md` and `.github/copilot-instructions.md` so coding agents and GitHub Copilot code review share the same repository policy.
