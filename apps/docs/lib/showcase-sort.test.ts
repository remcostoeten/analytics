import { describe, expect, test } from "bun:test";

import { sortByPageviews } from "./showcase-sort";

function names(projects: Parameters<typeof sortByPageviews>[0]) {
  return sortByPageviews(projects).map((project) => project.name);
}

describe("sortByPageviews", () => {
  test("orders projects from most to fewest pageviews", () => {
    expect(
      names([
        { name: "Small", pageviews: 2, visitors: 2 },
        { name: "Large", pageviews: 263, visitors: 117 },
        { name: "Medium", pageviews: 257, visitors: 104 },
      ]),
    ).toEqual(["Large", "Medium", "Small"]);
  });

  test("breaks a tie on visitors and then on the name", () => {
    expect(
      names([
        { name: "Beta", pageviews: 10, visitors: 4 },
        { name: "Alpha", pageviews: 10, visitors: 4 },
        { name: "Gamma", pageviews: 10, visitors: 9 },
      ]),
    ).toEqual(["Gamma", "Alpha", "Beta"]);
  });

  test("puts a project without stats after a project with zero pageviews", () => {
    expect(
      names([
        { name: "Unknown", pageviews: null, visitors: null },
        { name: "Empty", pageviews: 0, visitors: 0 },
      ]),
    ).toEqual(["Empty", "Unknown"]);
  });

  test("leaves the input in its original order", () => {
    const projects = [
      { name: "Small", pageviews: 1, visitors: 1 },
      { name: "Large", pageviews: 9, visitors: 9 },
    ];
    sortByPageviews(projects);
    expect(projects.map((project) => project.name)).toEqual(["Small", "Large"]);
  });
});
