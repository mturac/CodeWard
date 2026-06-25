# Security Policy

## Supported Versions

CodeWard is pre-1.0. Security fixes target the latest minor release.

## Reporting a Vulnerability

Please report security issues privately by emailing the maintainers or using GitHub private vulnerability reporting when enabled.

Do not publish exploit details before maintainers have had a reasonable chance to investigate and patch.

## Security Principles

- CodeWard must not require source code to leave the repository for deterministic checks.
- CodeWard must not collect telemetry by default.
- CodeWard must not execute arbitrary project commands unless the user explicitly runs them outside CodeWard.
- Config parsing must treat repository files as untrusted input.
