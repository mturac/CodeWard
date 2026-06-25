# Architecture

CodeWard is a TypeScript monorepo.

```txt
apps/cli          CLI entrypoint and commands
packages/core     shared types, config, filesystem, git helpers
packages/analyzer repo scanning and context extraction
packages/agents-md agent instruction file generation
packages/rules    deterministic guardrail rule engine
packages/github   PR risk report and GitHub annotation formatting
```

## Runtime Boundary

CodeWard reads repository files and runs fixed git commands for changed-file detection. It does not execute project scripts, install packages inside target repositories, or run arbitrary shell commands from config.

## v0.1 Flow

1. `codeward init` creates `.codeward/config.yml`, `.codeward/repo-map.json`, configured instruction files such as `AGENTS.md` and `.github/copilot-instructions.md`, and a GitHub Action workflow.
2. `codeward scan` detects package manager, frameworks, scripts, environment variables, routes, tests, risky paths, and config files.
3. `codeward agents` renders repo-aware agent instructions for configured targets.
4. `codeward check` runs deterministic guardrail rules over current repo context and changed files.
5. `codeward ci` prints the same report plus GitHub annotations.
6. `codeward task` turns issue text into a scoped task pack for an AI coding agent.
