# CodeWard Copilot Instructions

Use these instructions when reviewing pull requests or suggesting code changes for CodeWard.

## Product Boundary

- CodeWard is an open-source guardrail CLI for AI-assisted engineering teams.
- Keep the first release useful without an LLM or API key.
- Do not turn CodeWard into a generic AI code writer.
- The core flow is: analyze repo, generate instruction files, enforce policy, produce a PR risk report.

## Review Focus

- Prioritize deterministic guardrail behavior, stable CLI output, and security-sensitive defaults.
- Flag changes that add arbitrary command execution, telemetry, network calls, or secret exposure.
- Check that generator, rule, analyzer, and CLI changes include focused tests.
- Keep GitHub App, dashboard, MCP server, and hosted product code out of the v0.1 core unless explicitly requested.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
