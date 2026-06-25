# Philosophy

AI coding agents are fast. Production codebases need discipline.

CodeWard is not a code generator and not a replacement for human review. It is a repository guardrail layer:

```txt
analyze repo -> generate instruction files -> enforce policy -> produce PR risk report
```

The deterministic core must work without an LLM or API key. Optional AI review can be added later, but the open-source base should stay transparent, local, and auditable.

## Principles

- Rules in markdown are guidance.
- Checks in CI are enforcement.
- Repo-specific context beats generic advice.
- Security-sensitive paths deserve explicit review.
- Good task packs produce better agent work.
- No code should leave the user's machine for deterministic checks.
