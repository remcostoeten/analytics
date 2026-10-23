import { describe, expect, test } from "bun:test";
import type { ProjectBreakdownRow, PublicProject } from "@spoar/contract";

import { rankProjects } from "../src/modules/home/projects";

function project(id: string, name: string): PublicProject {
  return {
    id,
    name,
    domain: `${id}.example.com`,
    visibility: "public",
    createdAt: "2026-10-01T00:00:00.000Z",
  };
}

function row(id: string, visitors: number, change: number | null): ProjectBreakdownRow {
  return {
    value: id,
    name: id,
    visibility: "public",
    visitors,
    pageviews: visitors * 3,
    change: { visitors: change },
    speedScore: null,
    openIssues: null,
  };
}

describe("rankProjects", () => {
  test("ranks by visitors and carries pageviews and change", () => {
    const ranked = rankProjects(
      [project("a", "Alpha"), project("b", "Beta")],
      [row("a", 10, 0.5), row("b", 40, -0.1)],
    );
    expect(ranked.map((entry) => entry.id)).toEqual(["b", "a"]);
    expect(ranked[0]).toMatchObject({ visitors: 40, pageviews: 120, change: -0.1 });
  });

  test("keeps projects without traffic after the ones with traffic, by name", () => {
    const ranked = rankProjects(
      [project("z", "Zulu"), project("m", "Mike"), project("a", "Alpha")],
      [row("a", 5, null)],
    );
    expect(ranked.map((entry) => entry.id)).toEqual(["a", "m", "z"]);
    expect(ranked[1]).toMatchObject({ visitors: 0, pageviews: 0, change: null });
  });

  test("ignores traffic rows for projects the caller cannot read", () => {
    const ranked = rankProjects([project("a", "Alpha")], [row("hidden", 99, 1)]);
    expect(ranked.map((entry) => entry.id)).toEqual(["a"]);
  });
});
