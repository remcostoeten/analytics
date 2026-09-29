import { FormatRegistry } from "@sinclair/typebox";

// Matches an RFC 3339 date-time such as 2026-09-27T16:40:00.120Z or 2026-09-27T18:40:00+02:00.
const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/i;
// Matches a calendar date such as 2026-09-27.
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
// Matches any RFC 4122 UUID, including version 7.
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Matches a mail address with one @ and a dot in the domain, such as remco@gmail.com.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDateTime(value: string) {
  return dateTimePattern.test(value) && !Number.isNaN(Date.parse(value));
}

function isDate(value: string) {
  return datePattern.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function isUri(value: string) {
  return URL.canParse(value);
}

const formats: [string, (value: string) => boolean][] = [
  ["date-time", isDateTime],
  ["date", isDate],
  ["uuid", (value) => uuidPattern.test(value)],
  ["uri", isUri],
  ["email", (value) => emailPattern.test(value)],
];

/**
 * @name registerFormats
 * @description Registers the string formats the contract uses with TypeBox, unless another
 * package such as Elysia registered them first. TypeBox 0.34 knows no formats by default, so
 * `Value.Check` rejects every formatted string until this runs.
 *
 * @example
 * registerFormats();
 * Value.Check(IngestEnvelope, payload);
 */
export function registerFormats() {
  for (const [name, check] of formats) {
    if (!FormatRegistry.Has(name)) FormatRegistry.Set(name, check);
  }
}
