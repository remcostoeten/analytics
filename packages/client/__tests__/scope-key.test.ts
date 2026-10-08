import { describe, expect, test } from "bun:test";

import { createClient } from "../src/index";

function client() {
  return createClient({
    endpoint: "https://api.example.test/",
    token: "at_read",
    fetch: async () => Response.json({ data: [] }),
    projects: ["skriuw", "dora"],
  });
}

describe("scope keys", () => {
  test("a key holds the project, the route, the sorted query and the route arguments", () => {
    const key = client()
      .skriuw.period("7d")
      .where({ country: "NL" })
      .key("breakdown", "page", { limit: 10 });
    expect(key).toEqual([
      "spoar",
      "skriuw",
      "breakdown",
      [
        ["filter[country]", "NL"],
        ["period", "7d"],
      ],
      "page",
      { limit: 10 },
    ]);
  });

  test("the same request gives an equal key whatever order the links ran in", () => {
    const skriuw = client().skriuw;
    const first = skriuw.where({ country: "NL" }).human().period("30d").where({ device: "mobile" });
    const second = skriuw.period("30d").where({ device: "mobile", country: "NL" }).human();
    expect(first.key("stats")).toEqual(second.key("stats"));
  });

  test("a different scope, project or route gives a different key", () => {
    const api = client();
    const base = api.skriuw.period("7d");
    expect(base.key("stats")).not.toEqual(base.period("30d").key("stats"));
    expect(base.key("stats")).not.toEqual(api.dora.period("7d").key("stats"));
    expect(base.key("stats")).not.toEqual(base.key("realtime"));
  });

  test("the combined scope keys on a null project", () => {
    expect(client().period("24h").key("projectBreakdown")).toEqual([
      "spoar",
      null,
      "projectBreakdown",
      [["period", "24h"]],
    ]);
  });

  test("a key survives a JSON round trip unchanged", () => {
    const key = client()
      .skriuw.between("2026-09-01T00:00:00.000Z", "2026-10-01T00:00:00.000Z")
      .key("stats");
    expect(JSON.parse(JSON.stringify(key))).toEqual(key);
  });
});
