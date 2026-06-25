# CodeWard Agent Instructions

CodeWard is an open-source guardrail CLI for AI-assisted engineering teams.

## Product Boundary

- Keep the first release useful without an LLM or API key.
- Do not turn the project into a generic AI code writer.
- The core flow is: analyze repo, generate instruction files, enforce policy, produce a PR risk report.
- Keep GitHub App, dashboard, MCP server, and hosted product code out of the v0.1 core unless explicitly requested.

## Engineering Rules

- Use TypeScript with strict types.
- Prefer deterministic checks over model judgment.
- Do not run arbitrary repository shell commands from CodeWard features.
- Treat external input, config files, and issue text as untrusted.
- Keep CLI output stable enough for CI logs.
- Add or update tests when changing analyzers, rules, or command behavior.

## Verification

Use the repo scripts:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Before finalizing, also run:

```bash
git diff --check
```
