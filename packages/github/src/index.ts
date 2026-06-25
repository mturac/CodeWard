import type { CheckResult, Finding } from "@codeward/core";

export function formatRiskReport(result: CheckResult): string {
  const lines = [
    "CodeWard Risk Report",
    "",
    `Risk: ${capitalize(result.risk)}`,
    "",
    "Findings:"
  ];

  if (!result.findings.length) {
    lines.push("- None");
  } else {
    result.findings.forEach((finding, index) => {
      lines.push(
        `${index + 1}. [${finding.severity.toUpperCase()}] ${finding.title}`,
        `   Rule: ${finding.ruleId}`,
        finding.path ? `   Path: ${finding.path}` : "",
        `   ${finding.message}`,
        finding.suggestion ? `   Suggested fix: ${finding.suggestion}` : ""
      );
    });
  }

  lines.push("", "Suggested validation:");
  const commands = Object.values(result.validationCommands);
  if (!commands.length) {
    lines.push("- Add project validation commands to `.codeward/config.yml`.");
  } else {
    for (const command of commands) {
      lines.push(`- ${command}`);
    }
  }

  return `${lines.filter(Boolean).join("\n")}\n`;
}

export function formatGithubAnnotations(findings: Finding[]): string {
  return findings
    .map((finding) => {
      const command = finding.severity === "error" ? "error" : "warning";
      const path = finding.path ? ` file=${escapeProperty(finding.path)},` : "";
      return `::${command}${path}title=${escapeProperty(finding.title)}::${escapeData(finding.message)}`;
    })
    .join("\n");
}

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function escapeData(value: string): string {
  return value.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}
