import { CodeLine } from "./code-line";

type Props = {
  query: string[];
  keywords: ReadonlySet<string>;
  typed: number;
  fill: boolean;
};

export function Editor({ query, keywords, typed, fill }: Props) {
  const source = query.join("\n");
  const typing = typed < source.length;
  const lines = source.slice(0, typed).split("\n");
  const rows = Math.max(query.length, lines.length);

  return (
    <div
      className={`relative flex overflow-hidden border-b border-console-divider py-2.5 font-console-mono text-[12.5px] leading-5 @max-[520px]:text-[11.5px] ${fill ? "min-h-35 flex-1" : "h-35 flex-none"}`}
      aria-label="Query"
      role="textbox"
      aria-readonly="true"
      aria-multiline="true"
    >
      <div
        className="flex w-13 flex-none flex-col pr-2 pl-2.5 text-right text-console-dim"
        aria-hidden="true"
      >
        {Array.from({ length: rows }, (_, index) => (
          <span
            key={index}
            className="rounded-[3px] pr-2.5 data-[current=true]:bg-console-raised data-[current=true]:text-console-muted"
            data-current={index === lines.length - 1}
          >
            {index + 1}
          </span>
        ))}
      </div>
      <pre className="min-w-0 flex-1 overflow-hidden pl-3.5 whitespace-pre">
        {lines.map((line, index) => (
          <div key={index} className="min-h-5">
            <CodeLine line={line} keywords={keywords} />
            {typing && index === lines.length - 1 ? (
              <span className="ml-px inline-block h-[15px] w-px bg-console-fg align-[-3px]" />
            ) : null}
          </div>
        ))}
      </pre>
      <span
        className="absolute top-2 right-1.5 h-8 w-[3px] rounded-[2px] bg-console-line"
        aria-hidden="true"
      />
    </div>
  );
}
