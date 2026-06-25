import { FileText, Folder } from "lucide-react";
import type { RepoNode } from "../data";

type RepoTreeProps = {
  nodes: RepoNode[];
};

export function RepoTree({ nodes }: RepoTreeProps) {
  return (
    <section className="panel repo-panel" aria-labelledby="repo-heading">
      <div className="panel-heading">
        <p id="repo-heading">Repository</p>
        <span>analyzed</span>
      </div>
      <div className="repo-tree" role="tree" aria-label="Repository tree">
        {nodes.map((node) => {
          const Icon = node.kind === "folder" ? Folder : FileText;
          return (
            <div
              className={`repo-node ${node.active ? "is-active" : ""}`}
              key={`${node.depth}-${node.name}`}
              role="treeitem"
              style={{ "--depth": node.depth } as React.CSSProperties}
            >
              <Icon className="repo-icon" aria-hidden="true" />
              <span>{node.name}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
