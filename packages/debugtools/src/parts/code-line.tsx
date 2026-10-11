import { highlightLine } from "../highlight";
import type { TokenKind } from "../highlight";

const tokenClass: { [Kind in TokenKind]: string } = {
  keyword: "text-console-keyword",
  operator: "text-console-keyword",
  string: "text-console-string",
  number: "text-console-number",
  plain: "text-console-fg",
};

type Props = {
  line: string;
  keywords: ReadonlySet<string>;
};

export function CodeLine({ line, keywords }: Props) {
  return (
    <>
      {highlightLine(line, keywords).map((token, position) => (
        <span key={position} className={tokenClass[token.kind]}>
          {token.text}
        </span>
      ))}
    </>
  );
}
