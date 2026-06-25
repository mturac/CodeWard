# Rules

CodeWard v0.1 ships deterministic rules that are useful without an LLM.

## Built-in Rules

| Rule | Default | Purpose |
| --- | --- | --- |
| `requireAgentsMd` | error | Require configured repo-specific agent instruction files. |
| `envExampleSync` | error | Require detected environment variables to be documented in `.env.example`. |
| `dependencyChange` | warn | Flag package manifest and lockfile changes. |
| `riskyFileChange` | warn | Flag changes to configured high-risk paths. |
| `missingNearbyTest` | warn | Flag logic changes without a nearby or changed test. |
| `forbiddenAny` | warn | Flag explicit `any` in changed TypeScript files. |
| `silentCatch` | error | Flag empty catch blocks in changed source files. |

## Severity

Each rule can be set to `off`, `info`, `warn`, or `error` in `.codeward/config.yml`.

```yaml
rules:
  envExampleSync: error
  riskyFileChange: warn
  missingNearbyTest: warn
```
