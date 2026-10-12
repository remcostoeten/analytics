import { highlightLine } from "../highlight";

type Props = {
  query: string[];
  keywords: ReadonlySet<string>;
  typed: number;
};

export function Editor({ query, keywords, typed }: Props) {
  const source = query.join("\n");
  const typing = typed < source.length;
  const lines = source.slice(0, typed).split("\n");
  const rows = Math.max(query.length, lines.length);

  return (
    <div
      className="spc-editor"
      aria-label="Query"
      role="textbox"
      aria-readonly="true"
      aria-multiline="true"
    >
      <div className="spc-gutter" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <span key={index} data-current={index === lines.length - 1}>
            {index + 1}
          </span>
        ))}
      </div>
      <pre className="spc-code">
        {lines.map((line, index) => (
          <div key={index} className="spc-line">
            {highlightLine(line, keywords).map((token, position) => (
              <span key={position} className={`spc-token-${token.kind}`}>
                {token.text}
              </span>
            ))}
            {typing && index === lines.length - 1 ? <span className="spc-caret" /> : null}
          </div>
        ))}
      </pre>
      <span className="spc-scrollbar" aria-hidden="true" />
    </div>
  );
}
