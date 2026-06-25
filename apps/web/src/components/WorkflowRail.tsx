import type { WorkflowStep } from "../data";

type WorkflowRailProps = {
  steps: WorkflowStep[];
  activeStep: string;
  onStepChange: (id: string) => void;
};

export function WorkflowRail({ steps, activeStep, onStepChange }: WorkflowRailProps) {
  const active = steps.find((step) => step.id === activeStep) ?? steps[0];

  if (!active) {
    return null;
  }

  return (
    <aside className="workflow-rail" aria-label="CodeWard workflow">
      <div className="workflow-steps">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = step.id === active.id;
          return (
            <button
              className={isActive ? "is-active" : ""}
              key={step.id}
              onClick={() => onStepChange(step.id)}
              type="button"
            >
              <Icon aria-hidden="true" />
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>
      <div className="workflow-detail" aria-live="polite">
        <strong>{active.label}</strong>
        <p>{active.detail}</p>
      </div>
    </aside>
  );
}
