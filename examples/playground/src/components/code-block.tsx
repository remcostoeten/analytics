import { useState } from "react";
import { useHighlight } from "../highlight";
import type { Language } from "../highlight";

export type Snippet = {
  name: string;
  code: string;
  language: Language;
};

type Props = {
  snippets: Snippet[];
  tall?: boolean;
};

export function CodeBlock({ snippets, tall }: Props) {
  const [active, setActive] = useState(0);
  const [copied, setCopied] = useState(false);
  const snippet = snippets[active] ?? snippets[0];
  const html = useHighlight(snippet?.code ?? "", snippet?.language ?? "typescript");
  if (!snippet) return null;

  function copy() {
    navigator.clipboard.writeText(snippet?.code ?? "").then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      },
      (error) => console.warn("Copy failed", error),
    );
  }

  return (
    <div className={tall ? "code tall" : "code"}>
      <div className="code-head">
        <div className="tabs" role="tablist">
          {snippets.map((item, index) => (
            <button
              key={item.name}
              type="button"
              role="tab"
              aria-selected={index === active}
              className={index === active ? "tab active" : "tab"}
              onClick={() => setActive(index)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <button type="button" className="ghost" onClick={copy}>
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {html ? (
        <div className="highlighted" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre>
          <code>{snippet.code}</code>
        </pre>
      )}
    </div>
  );
}
