import { useMemo, useState } from "react";
import { CheckCircle2, GitBranch, RotateCcw, ShieldCheck } from "lucide-react";
import { CommandConsole } from "./components/CommandConsole";
import { GuardrailPanel } from "./components/GuardrailPanel";
import { RepoTree } from "./components/RepoTree";
import { RiskChecklist } from "./components/RiskChecklist";
import { WorkflowRail } from "./components/WorkflowRail";
import { guardrailFiles, repoNodes, riskChecks, workflowSteps } from "./data";
import type { RiskState } from "./data";

export function App() {
  const [selectedFile, setSelectedFile] = useState(guardrailFiles[0]?.path ?? "");
  const [selectedCheck, setSelectedCheck] = useState(riskChecks[0]?.id ?? "");
  const [riskFilter, setRiskFilter] = useState<RiskState | "all">("all");
  const [activeStep, setActiveStep] = useState(workflowSteps[0]?.id ?? "");
  const [activeCommand, setActiveCommand] = useState("init");

  const riskCounts = useMemo(
    () => ({
      good: riskChecks.filter((check) => check.state === "good").length,
      review: riskChecks.filter((check) => check.state === "review").length,
      high: riskChecks.filter((check) => check.state === "high").length
    }),
    []
  );

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="CodeWard home">
          <span className="brand-mark" aria-hidden="true">
            <ShieldCheck />
          </span>
          <span>
            <strong>CodeWard</strong>
            <small>agent-ready workspace</small>
          </span>
        </a>

        <nav className="topbar-actions" aria-label="Workspace actions">
          <a className="ghost-action" href="https://github.com/mturac/CodeWard">
            <GitBranch aria-hidden="true" />
            GitHub
          </a>
          <button className="ghost-action" onClick={() => setRiskFilter("all")} type="button">
            <RotateCcw aria-hidden="true" />
            Reset
          </button>
          <button className="primary-action" onClick={() => setActiveCommand("check")} type="button">
            <CheckCircle2 aria-hidden="true" />
            Run check
          </button>
        </nav>
      </header>

      <section className="workspace-status" aria-label="Repository status">
        <div>
          <h1>Turn any repository into an AI-agent-ready workspace.</h1>
          <p>
            Analyze structure, generate guardrail files, and review pull request risk with deterministic checks.
          </p>
        </div>
        <dl>
          <div>
            <dt>Generated</dt>
            <dd>{guardrailFiles.length}</dd>
          </div>
          <div>
            <dt>Good</dt>
            <dd>{riskCounts.good}</dd>
          </div>
          <div>
            <dt>Review</dt>
            <dd>{riskCounts.review + riskCounts.high}</dd>
          </div>
        </dl>
      </section>

      <div className="workspace-grid">
        <RepoTree nodes={repoNodes} />
        <GuardrailPanel files={guardrailFiles} selectedPath={selectedFile} onSelect={setSelectedFile} />
        <RiskChecklist
          checks={riskChecks}
          filter={riskFilter}
          onFilterChange={setRiskFilter}
          onSelectCheck={setSelectedCheck}
          selectedCheck={selectedCheck}
        />
        <WorkflowRail activeStep={activeStep} onStepChange={setActiveStep} steps={workflowSteps} />
        <CommandConsole activeCommand={activeCommand} onCommandChange={setActiveCommand} />
      </div>
    </main>
  );
}
