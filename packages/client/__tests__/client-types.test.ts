import { describe, expect, expectTypeOf, test } from "bun:test";

import type { BreakdownResponse, ProjectBreakdownResponse, StatsResponse } from "@spoar/contract";

import { createClient } from "../src/index";
import type { ClientResult, ProjectScope } from "../src/index";

const api = createClient({
  endpoint: "https://api.example.test",
  token: "at_test",
  projects: ["skriuw", "dora"],
});

function editorCatches() {
  // @ts-expect-error: not in projects
  void api.project("skriuww");
  // @ts-expect-error: not a known property either
  void api.skriuww;

  // @ts-expect-error: not a dimension
  void api.skriuw.breakdown("colour");
  // @ts-expect-error: not a metric
  void api.skriuw.timeseries("visits");
  // @ts-expect-error: sum:prop. needs a key, and sum:revenue is not a metric
  void api.skriuw.timeseries("sum:revenue");
  // @ts-expect-error: not a dimension in a filter either
  void api.skriuw.where({ colour: "red" });
  // @ts-expect-error: 7d, 24h, 30d, 90d, 12mo or all
  void api.skriuw.period("1w");
  // @ts-expect-error: human, bots, internal or all
  void api.skriuw.traffic("robots");

  // @ts-expect-error: people lives on the combined scope only
  void api.skriuw.people();
  // @ts-expect-error: overview lives on a project scope only
  void api.overview();
  // @ts-expect-error: a download needs a format
  void api.skriuw.download.visitors({});
  // @ts-expect-error: json is not a download format
  void api.skriuw.download.visitors({ format: "json" });

  // @ts-expect-error: not a route
  void api.skriuw.key("statz");
  // @ts-expect-error: download is a namespace, not a route
  void api.skriuw.key("download");
  // @ts-expect-error: a key takes the route's own arguments
  void api.skriuw.key("breakdown", "colour");
}

describe("client types", () => {
  test("project properties and project() are the same scope", () => {
    expectTypeOf(api.skriuw).toEqualTypeOf<ProjectScope>();
    expectTypeOf(api.project("dora")).toEqualTypeOf<ProjectScope>();
    expectTypeOf(
      api.skriuw.period("7d").where({ "prop:plan": "pro" }),
    ).toEqualTypeOf<ProjectScope>();
  });

  test("terminals keep their contract response types", () => {
    expectTypeOf(api.skriuw.stats()).toEqualTypeOf<ClientResult<StatsResponse>>();
    expectTypeOf(api.skriuw.breakdown("trait:plan")).toEqualTypeOf<
      ClientResult<BreakdownResponse>
    >();
    expectTypeOf(api.projectBreakdown()).toEqualTypeOf<ClientResult<ProjectBreakdownResponse>>();
    expectTypeOf(api.skriuw.download.breakdown("page", { format: "csv" })).toEqualTypeOf<
      ClientResult<string>
    >();
  });

  test("a client without a project list has no project properties", () => {
    const open = createClient({ endpoint: "https://api.example.test" });
    expectTypeOf(open.project("anything")).toEqualTypeOf<ProjectScope>();
    expectTypeOf<keyof typeof open>().toEqualTypeOf<
      keyof ReturnType<typeof createClient<string>>
    >();
    expect(typeof editorCatches).toBe("function");
  });
});
