<p align="center">
  <img src="docs/assets/codeward-hero.png" alt="CodeWard repo guardrail pipeline" width="100%">
</p>

# CodeWard

**Open-source repo guardrails for AI-assisted engineering.**

CodeWard turns any repository into an agent-ready, production-safe workspace. It analyzes your codebase, generates project-specific instruction files such as `AGENTS.md` and `.github/copilot-instructions.md`, and checks pull requests for risky changes before AI-generated code reaches production.

**Languages:** English | [中文](README.zh-CN.md) | [Français](README.fr.md) | [Türkçe](README.tr.md)

## Why CodeWard

AI coding agents are fast. Production codebases still need discipline.

CodeWard helps teams define and enforce:

- repository-specific agent instructions
- architecture and ownership boundaries
- validation commands
- risky file policies
- security-sensitive checks
- pull request guardrails
- issue-to-agent task packs
- custom deterministic rules

CodeWard does not replace Cursor, Claude Code, Codex, Copilot, or other coding agents. It gives them better rails.

## What It Does

```txt
analyze repo -> generate instruction files -> enforce policy -> produce PR risk report
```

CodeWard v0.1 is useful without an LLM or API key.

| Capability | What you get |
| --- | --- |
| Repo scan | Frameworks, package manager, scripts, env usage, risky paths, routes, and tests |
| Instruction files | Repo-aware `AGENTS.md` and `.github/copilot-instructions.md` |
| Deterministic checks | Missing instructions, env drift, dependency changes, risky paths, missing nearby tests, explicit `any`, silent catches |
| GitHub Action | PR annotations and fail-on-error policy |
| Task packs | Issue text converted into agent-ready implementation briefs |

## Quick Start

Install and verify the repository:

```bash
pnpm install
pnpm build
pnpm check
```

Open the Vite product interface:

```bash
pnpm dev:web
```

Try CodeWard against the included fixture:

```bash
pnpm codeward init --root examples/next-prisma-saas
pnpm codeward scan --root examples/next-prisma-saas
pnpm codeward check --root examples/next-prisma-saas --no-fail
```

Run CodeWard against another local repository from this checkout:

```bash
pnpm codeward init --root /path/to/repo
pnpm codeward scan --root /path/to/repo
pnpm codeward agents --root /path/to/repo --target agents,copilot --write
pnpm codeward check --root /path/to/repo
```

## CLI

```txt
codeward init      Create instruction files, .codeward/config.yml, repo-map, and CI workflow
codeward scan      Print or write machine-readable repository context
codeward agents    Generate repo-aware AGENTS.md and Copilot instructions
codeward check     Run deterministic production guardrail checks
codeward ci        Run checks with GitHub-friendly output
codeward task      Convert issue text into an agent-ready task pack
```

## Example Risk Report

```txt
CodeWard Risk Report

Risk: Medium

Findings:
1. [WARN] Logic changed without a nearby test
   Rule: missingNearbyTest
   Path: src/server/billing/updatePlan.ts

2. [WARN] High-risk path changed
   Rule: riskyFileChange
   Path: src/server/billing/updatePlan.ts

Suggested validation:
- pnpm lint
- pnpm typecheck
- pnpm test
- pnpm build
```

## Configuration

```yaml
project:
  name: "my-app"
  stack:
    - typescript
    - nextjs
    - prisma

validation:
  commands:
    lint: "pnpm lint"
    typecheck: "pnpm typecheck"
    test: "pnpm test"
    build: "pnpm build"

risk:
  high:
    - "src/server/auth/**"
    - "src/server/billing/**"
    - "prisma/migrations/**"
    - ".github/workflows/**"
    - "package.json"
    - "pnpm-lock.yaml"

rules:
  envExampleSync: error
  riskyFileChange: warn
  missingNearbyTest: warn
  silentCatch: error

agents:
  output: "AGENTS.md"
  style: "strict"
  targets:
    - agents
    - copilot
```

## GitHub Action

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

## Project Structure

```txt
apps/cli              CLI entrypoint and commands
apps/web              Vite product interface for the guardrail workflow
packages/core         shared types, config, filesystem, and git helpers
packages/analyzer     repository scanning and context extraction
packages/agents-md    instruction file generation
packages/rules        deterministic guardrail rule engine
packages/github       PR risk report and GitHub annotation formatting
docs/                 design notes and usage docs
examples/             fixture repositories
```

## Development

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
```

## License

Apache-2.0.
