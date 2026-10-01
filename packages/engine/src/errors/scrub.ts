// A query string: from "?" up to whitespace, "#", a quote, a bracket or the ":" before a line number.
const queryString = /\?([^\s#"'():]*)/g;
// An email address.
const email = /(?<![\w.+-])[\w.+-]+@[\w-]+\.[\w.-]+/g;
// A token: 20 or more word characters or dashes in a row.
const token = /(?<![\w-])[\w-]{20,}(?![\w-])/g;
// A run of 6 or more digits.
const longNumber = /\d{6,}/g;

function keepUtm(query: string) {
  const kept = query.split("&").filter((pair) => pair.toLowerCase().startsWith("utm_"));
  return kept.length > 0 ? `?${kept.join("&")}` : "";
}

/**
 * @name scrubText
 * @description Removes personal data from an error message, stack or breadcrumb: query strings
 * except `utm_` parameters, emails, tokens of 20 or more characters and runs of 6 or more digits.
 *
 * @example
 * scrubText("GET /a?token=x&utm_source=hn for ada@example.com"); // "GET /a?utm_source=hn for [x]"
 */
export function scrubText(text: string): string {
  return text
    .replaceAll(queryString, (_, query: string) => keepUtm(query))
    .replaceAll(email, "[x]")
    .replaceAll(token, "[x]")
    .replaceAll(longNumber, "[x]");
}
