# Writing Rules

Custom rule packs are not part of the stable v0.1 API yet. Until the API is public, use `.codeward/config.yml` to tune the built-in rules and risk paths.

Good deterministic rules should:

- avoid network calls
- avoid arbitrary command execution
- produce stable output in CI
- include a clear suggestion
- map to a repository risk the team understands
- be testable with small fixtures
