import { beforeAll, describe, expect, test } from "bun:test";

import { lintCases } from "./lint";
import type { LintCase } from "./lint";

const code = "house(no-silent-catch)";

const cases: LintCase[] = [
  { name: "empty catch", source: "try { run(); } catch {}", codes: [code] },
  {
    name: "catch with only a comment",
    source: "try { run(); } catch {\n  // blocked\n}",
    codes: [code],
  },
  { name: "catch with a binding", source: "try { run(); } catch (error) {}", codes: [code] },
  { name: "catch calling noop", source: "try { run(); } catch {\n  noop();\n}", codes: [] },
  {
    name: "catch rethrowing",
    source: "try { run(); } catch (error) {\n  throw error;\n}",
    codes: [],
  },
];

describe("house/no-silent-catch", () => {
  let results: string[][] = [];

  beforeAll(async () => {
    results = await lintCases(cases, "ts", "no-silent-catch");
  });

  for (const [index, { name, codes }] of cases.entries()) {
    test(name, () => {
      expect(results[index]).toEqual(codes);
    });
  }
});
