import { Play, TerminalSquare } from "lucide-react";
import { commands } from "../data";

type CommandConsoleProps = {
  activeCommand: string;
  onCommandChange: (id: string) => void;
};

export function CommandConsole({ activeCommand, onCommandChange }: CommandConsoleProps) {
  const command = commands.find((item) => item.id === activeCommand) ?? commands[0];

  if (!command) {
    return null;
  }

  return (
    <section className="console-panel" aria-labelledby="console-heading">
      <div className="console-tabs" aria-label="Command presets">
        {commands.map((item) => (
          <button
            className={item.id === command.id ? "is-active" : ""}
            key={item.id}
            onClick={() => onCommandChange(item.id)}
            type="button"
          >
            <Play aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>
      <div className="console-body">
        <div className="console-command">
          <TerminalSquare aria-hidden="true" />
          <code id="console-heading">{command.command}</code>
        </div>
        <ul aria-live="polite">
          {command.output.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
