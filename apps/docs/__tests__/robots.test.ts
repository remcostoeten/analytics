import { describe, expect, test } from "bun:test";

import robots from "../app/robots";

describe("robots.txt", () => {
  test("keeps every crawler out of the dashboard", () => {
    const rules = [robots().rules].flat();

    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.disallow).toContain("/dashboard");
    }
  });

  test("lets the AI crawlers read the docs and llms.txt", () => {
    const rules = [robots().rules].flat();
    const ai = rules.find((rule) => [rule.userAgent].flat().includes("GPTBot"));

    expect(ai?.allow).toEqual(["/", "/docs", "/llms.txt"]);
  });
});
