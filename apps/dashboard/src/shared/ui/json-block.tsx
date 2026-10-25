import { tokenizeJson } from "../json-tokens";
import type { JsonTokenKind } from "../json-tokens";
import { CopyButton } from "./copy-button";

type Props = { value: object; label?: string };

const tokenClass: { [Kind in JsonTokenKind]: string | undefined } = {
  key: "json-key",
  string: "json-string",
  number: "json-number",
  boolean: "json-literal",
  null: "json-literal",
  punctuation: "json-punctuation",
  plain: undefined,
};

export function JsonBlock({ value, label }: Props) {
  const json = JSON.stringify(value, null, 2);
  const lines = json.split("\n");
  return (
    <div className="json-block">
      <div className="json-block-head">
        <span>{label ?? "JSON"}</span>
        <CopyButton value={json} className="h-6 px-2 text-[0.625rem]" />
      </div>
      <pre className="json-block-body">
        {lines.map((line, index) => (
          <span key={index} className="json-line">
            {tokenizeJson(line).map((token, position) => (
              <span key={position} className={tokenClass[token.kind]}>
                {token.text}
              </span>
            ))}
          </span>
        ))}
      </pre>
    </div>
  );
}
