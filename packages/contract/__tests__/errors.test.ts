import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, test } from "bun:test";

import { errorCatalog, errorCodes } from "../src";

const reference = readFileSync(join(import.meta.dir, "../../../docs/v2/api-reference.md"), "utf8");

function documentedCodes(markdown: string) {
  const section = markdown.slice(markdown.indexOf("### Error codes"));
  // Matches table rows such as: | 404 | `NOT_FOUND` | ... |
  const rows = section.matchAll(/^\| (\d{3}) \| `([A-Z_]+)` \|/gm);
  return Array.from(rows, ([, status, code]) => ({ code, status: Number(status) }));
}

describe("error catalog", () => {
  test("covers every code in the API reference with the same status", () => {
    const documented = documentedCodes(reference);
    expect(documented.length).toBeGreaterThan(0);
    const catalogued = errorCodes.map((code) => ({ code, status: errorCatalog[code].status }));
    expect(documented).toEqual(catalogued);
  });

  test("marks only rate limits and server failures as retryable", () => {
    const retryable = errorCodes.filter((code) => errorCatalog[code].retryable);
    expect(retryable).toEqual(["RATE_LIMITED", "INTERNAL", "UNAVAILABLE"]);
  });
});
