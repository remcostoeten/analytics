import type { ClientError } from "@spoar/client";

export type FieldErrors = { [field: string]: string };

/**
 * @name hostOf
 * @description The bare host of whatever someone typed as a domain: no scheme, path, query or
 * port, lowercased.
 *
 * @example
 * hostOf("https://www.Example.com:443/path"); // "www.example.com"
 */
export function hostOf(domain: string) {
  // Strips the scheme, then everything from the first path, query or fragment character, then a port.
  const withoutScheme = domain
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "");
  const end = withoutScheme.search(/[/?#]/);
  return (end === -1 ? withoutScheme : withoutScheme.slice(0, end)).replace(/:\d+$/, "");
}

/**
 * @name suggestId
 * @description A project id from a domain: the host without `www.`, with anything outside the
 * id alphabet turned into a dash, cut to 64 characters.
 *
 * @example
 * suggestId("https://www.remcostoeten.nl"); // "remcostoeten.nl"
 */
export function suggestId(domain: string) {
  return hostOf(domain)
    .replace(/^www\./, "")
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^[.-]+/, "")
    .slice(0, 64);
}

/**
 * @name defaultOrigins
 * @description The origins a new project most likely sends from: the https origin of the host
 * and, unless it already starts with `www.`, its `www.` twin.
 *
 * @example
 * defaultOrigins("example.com"); // ["https://example.com", "https://www.example.com"]
 */
export function defaultOrigins(domain: string) {
  const bare = hostOf(domain);
  if (bare.length === 0) return [];
  if (bare.startsWith("www.")) return [`https://${bare}`];
  return [`https://${bare}`, `https://www.${bare}`];
}

/**
 * @name lines
 * @description The non-empty trimmed lines of a textarea, for list fields such as origins.
 *
 * @example
 * lines(" https://a.com \n\nhttps://b.com"); // ["https://a.com", "https://b.com"]
 */
export function lines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * @name fieldErrors
 * @description The per-field messages of a `VALIDATION_FAILED` answer, keyed by field name
 * without the leading slash, and nothing for any other error.
 *
 * @example
 * fieldErrors(error).id; // "Expected string to match '^[a-z0-9][a-z0-9.-]*$'"
 */
export function fieldErrors(error: ClientError): FieldErrors {
  const fields = error.details?.fields;
  if (!Array.isArray(fields)) return {};
  const errors: FieldErrors = {};
  for (const field of fields) {
    if (typeof field !== "object" || field === null || Array.isArray(field)) continue;
    const { path, message } = field;
    if (typeof path !== "string" || typeof message !== "string") continue;
    errors[path.replace(/^\//, "")] = message;
  }
  return errors;
}
