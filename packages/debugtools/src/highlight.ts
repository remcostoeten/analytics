export type TokenKind = "keyword" | "string" | "number" | "operator" | "plain";

export type Token = {
  kind: TokenKind;
  text: string;
};

export type Emphasis = {
  text: string;
  strong: boolean;
};

// Quoted strings (closed or still being typed), numbers with an optional unit, words, operators, anything else.
const tokenPattern =
  /('[^']*'?|"[^"]*"?)|(\b\d+(?:\.\d+)?[a-z]*\b)|([A-Za-z_]\w*)|(\||==|!=|>=|<=|>|<)|(\s+|.)/g;

function push(tokens: Token[], kind: TokenKind, text: string) {
  const last = tokens.at(-1);
  if (last && last.kind === kind) {
    last.text += text;
    return;
  }
  tokens.push({ kind, text });
}

/**
 * @name highlightLine
 * @description Splits one line of a pipeline query into tokens for syntax colouring. Words in
 * `keywords` (case-insensitive) become keywords, quoted text becomes strings even while the
 * closing quote is not typed yet, and adjacent plain text is merged.
 *
 * @example
 * highlightLine("| where ['type'] == \"error\"", new Set(["where"]));
 * // [{ kind: "operator", text: "|" }, { kind: "plain", text: " " }, { kind: "keyword", text: "where" }, ...]
 */
export function highlightLine(line: string, keywords: ReadonlySet<string>): Token[] {
  const tokens: Token[] = [];
  for (const match of line.matchAll(tokenPattern)) {
    const [text, quoted, number, word, operator] = match;
    if (quoted) push(tokens, "string", text);
    else if (number) push(tokens, "number", text);
    else if (word) push(tokens, keywords.has(word.toLowerCase()) ? "keyword" : "plain", text);
    else if (operator) push(tokens, "operator", text);
    else push(tokens, "plain", text);
  }
  return tokens;
}

/**
 * @name parseEmphasis
 * @description Splits agent text on `**double asterisks**` into plain and strong runs, so data
 * can mark the values the transcript should highlight.
 *
 * @example
 * parseEmphasis("Rose from **0.4%** to **6.1%**");
 * // [{ text: "Rose from ", strong: false }, { text: "0.4%", strong: true }, ...]
 */
export function parseEmphasis(text: string): Emphasis[] {
  return text
    .split("**")
    .map((part, index) => ({ text: part, strong: index % 2 === 1 }))
    .filter((part) => part.text.length > 0);
}
