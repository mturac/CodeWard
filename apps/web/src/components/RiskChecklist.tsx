import type { RiskCheck, RiskState } from "../data";
import { statusIcon } from "../data";

type RiskChecklistProps = {
  checks: RiskCheck[];
  selectedCheck: string;
  filter: RiskState | "all";
  onFilterChange: (filter: RiskState | "all") => void;
  onSelectCheck: (id: string) => void;
};

const filterLabels: Array<RiskState | "all"> = ["all", "high", "review", "good"];

export function RiskChecklist({
  checks,
  selectedCheck,
  filter,
  onFilterChange,
  onSelectCheck
}: RiskChecklistProps) {
  const visibleChecks = checks.filter((check) => filter === "all" || check.state === filter);
  const selected = checks.find((check) => check.id === selectedCheck) ?? checks[0];

  return (
    <section className="panel risk-panel" aria-labelledby="risk-heading">
      <div className="panel-heading">
        <div>
          <p id="risk-heading">PR risk checklist</p>
          <strong>Automated risk assessment.</strong>
        </div>
        <span>medium</span>
      </div>

      <div className="risk-filters" aria-label="Risk filters">
        {filterLabels.map((label) => (
          <button
            className={filter === label ? "is-active" : ""}
            key={label}
            onClick={() => onFilterChange(label)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className="check-list" role="list">
        {visibleChecks.map((check) => {
          const Icon = statusIcon[check.state];
          return (
            <button
              className={`check-row ${check.state} ${selected?.id === check.id ? "is-selected" : ""}`}
              key={check.id}
              onClick={() => onSelectCheck(check.id)}
              type="button"
            >
              <Icon className="check-icon" aria-hidden="true" />
              <span>
                <strong>{check.label}</strong>
                <small>{check.detail}</small>
              </span>
              <em>{check.state}</em>
            </button>
          );
        })}
      </div>

      <div className="risk-summary" aria-live="polite">
        <div>
          <span>Overall risk</span>
          <strong>Medium</strong>
        </div>
        <div className="risk-meter" aria-hidden="true">
          <span />
        </div>
        <p>{selected?.evidence}</p>
      </div>
    </section>
  );
}
