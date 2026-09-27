type Scan = {
  statements: string[];
  current: string;
  quote: "'" | '"' | null;
  dollarTag: string | null;
  lineComment: boolean;
};

// Matches a dollar-quote opener such as $$ or $body$ at the start of the string.
const dollarTagPattern = /^\$[A-Za-z_]*\$/;

function flush(scan: Scan) {
  const statement = scan.current.trim();
  if (statement.length > 0) scan.statements.push(statement);
  scan.current = "";
}

/**
 * @name splitStatements
 * @description Splits a SQL file into single statements the way psql sends them, respecting
 * quoted strings, quoted identifiers, dollar-quoted bodies and line comments. Statements such as
 * `CREATE INDEX CONCURRENTLY` cannot run inside the implicit transaction of a multi-statement
 * query, so migrations run one statement at a time.
 *
 * @example
 * splitStatements("CREATE TABLE a (id int); DO $$ BEGIN PERFORM 1; END $$;");
 * // ["CREATE TABLE a (id int)", "DO $$ BEGIN PERFORM 1; END $$"]
 */
export function splitStatements(sql: string) {
  const scan: Scan = {
    statements: [],
    current: "",
    quote: null,
    dollarTag: null,
    lineComment: false,
  };
  let index = 0;
  while (index < sql.length) {
    const char = sql.charAt(index);
    const rest = sql.slice(index);
    if (scan.lineComment) {
      if (char === "\n") scan.lineComment = false;
      index += 1;
      continue;
    }
    if (scan.dollarTag) {
      if (rest.startsWith(scan.dollarTag)) {
        scan.current += scan.dollarTag;
        index += scan.dollarTag.length;
        scan.dollarTag = null;
        continue;
      }
      scan.current += char;
      index += 1;
      continue;
    }
    if (scan.quote) {
      scan.current += char;
      if (char === scan.quote) scan.quote = null;
      index += 1;
      continue;
    }
    if (rest.startsWith("--")) {
      scan.lineComment = true;
      index += 2;
      continue;
    }
    const tag = dollarTagPattern.exec(rest)?.[0];
    if (tag) {
      scan.dollarTag = tag;
      scan.current += tag;
      index += tag.length;
      continue;
    }
    if (char === "'" || char === '"') {
      scan.quote = char;
    } else if (char === ";") {
      flush(scan);
      index += 1;
      continue;
    }
    scan.current += char;
    index += 1;
  }
  flush(scan);
  return scan.statements;
}
