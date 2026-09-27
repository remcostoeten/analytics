import { describe, expect, test } from "bun:test";

import { lintSource } from "./lint";

const code = "house(no-silent-catch)";

const cases = [
  { name: "empty catch", source: "try { run(); } catch {}", codes: [code] },
  {
    name: "catch with only a comment",
    source: "try { run(); } catch {\n  // blocked\n}",
    codes: [code],
  },
  { name: "catch with a binding", source: "try { run(); } catch (error) {}", codes: [code] },
  { name: "catch calling noop", source: "try { run(); } catch {\n  noop();\n}", codes: [] },
  { name: "catch rethrowing", source: "try { run(); } catch (error) {\n  throw error;\n}", codes: [] },
];

describe("house/no-silent-catch", () => {
  for (const { name, source, codes } of cases) {
    test(name, async () => {
      expect(await lintSource("input.ts", source, "no-silent-catch")).toEqual(codes);
    });
  }
});
