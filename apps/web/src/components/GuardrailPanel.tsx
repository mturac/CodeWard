import type { GuardrailFile } from "../data";

type GuardrailPanelProps = {
  files: GuardrailFile[];
  selectedPath: string;
  onSelect: (path: string) => void;
};

export function GuardrailPanel({ files, selectedPath, onSelect }: GuardrailPanelProps) {
  const selected = files.find((file) => file.path === selectedPath) ?? files[0];

  if (!selected) {
    return null;
  }

  return (
    <section className="panel guardrail-panel" aria-labelledby="guardrail-heading">
      <div className="panel-heading">
        <div>
          <p id="guardrail-heading">Generated guardrails</p>
          <strong>AI agents get clear boundaries.</strong>
        </div>
        <span>4 files</span>
      </div>

      <div className="guardrail-grid">
        <div className="guardrail-list" role="list" aria-label="Generated files">
          {files.map((file) => {
            const Icon = file.icon;
            const isSelected = file.path === selected.path;
            return (
              <button
                className={`file-card ${isSelected ? "is-selected" : ""}`}
                key={file.path}
                onClick={() => onSelect(file.path)}
                type="button"
              >
                <span className="file-icon" aria-hidden="true">
                  <Icon />
                </span>
                <span>
                  <strong>{file.path}</strong>
                  <small>{file.description}</small>
                </span>
                <em>{file.status}</em>
              </button>
            );
          })}
        </div>

        <div className="preview-card" aria-live="polite">
          <div className="preview-header">
            <span>{selected.title}</span>
            <strong>{selected.path}</strong>
          </div>
          <pre>
            {selected.preview.map((line) => (
              <code key={line}>{line}</code>
            ))}
          </pre>
        </div>
      </div>
    </section>
  );
}
