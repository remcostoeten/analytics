import { useMemo, useState } from "react";

import type { JsonValue } from "../client/types";
import { buildLines, toggleNode } from "../json/tree";
import type { Link, Resolve } from "../json/tree";

type Props = {
  value: JsonValue;
  resolve: Resolve;
  onLink: (link: Link) => void;
};

export function JsonTree({ value, resolve, onLink }: Props) {
  const [collapsed, setCollapsed] = useState(() => new Set<string>());
  const lines = useMemo(() => buildLines(value, collapsed, resolve), [value, collapsed, resolve]);

  return (
    <div className="json" role="tree">
      {lines.map((line) => {
        const link = line.link;
        const text = link ? (
          <button
            type="button"
            className={`jlink j-${line.tone}`}
            onClick={() => onLink(link)}
            title={link.type === "code" ? "Open in the error catalog" : `Jump to ${link.type}`}
          >
            {line.text}
          </button>
        ) : (
          <span className={`j-${line.tone}`}>{line.text}</span>
        );
        const toggle = line.toggle;
        return (
          <div
            key={line.path}
            className="jl"
            role="treeitem"
            aria-expanded={toggle ? !toggle.collapsed : undefined}
            style={{ paddingLeft: `${line.depth * 2}ch` }}
          >
            {toggle ? (
              <button
                type="button"
                className="jt"
                aria-label={toggle.collapsed ? "Expand" : "Collapse"}
                onClick={() => setCollapsed((current) => toggleNode(current, line.path))}
              >
                {toggle.collapsed ? "+" : "-"}
              </button>
            ) : (
              <span className="jt-gap" />
            )}
            {line.key !== null ? (
              <>
                <span className="j-key">{line.key}</span>
                <span className="j-punct">: </span>
              </>
            ) : null}
            {text}
            {line.comma ? <span className="j-punct">,</span> : null}
          </div>
        );
      })}
    </div>
  );
}
