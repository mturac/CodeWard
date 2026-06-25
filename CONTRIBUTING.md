# Contributing

Thanks for helping make CodeWard better.

## Local Setup

```bash
pnpm install
pnpm check
```

## Contribution Rules

- Keep changes focused.
- Add tests for analyzer, rule, and CLI behavior changes.
- Do not add LLM provider dependencies to the deterministic core.
- Do not introduce telemetry.
- Do not weaken security checks to make tests pass.

## Pull Requests

Include:

- what changed
- why it changed
- commands run
- screenshots or CLI output when user-facing behavior changes
