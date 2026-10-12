import { describe, expect, test } from "bun:test";
import { formatAge, isBehind, parseSelection, targets, toDeployment, type Row } from "../deploy";

const live = {
  id: "dpl_1",
  url: "a.vercel.app",
  state: "READY" as const,
  sha: "abc",
  created: 0,
  inspector: null,
};

function rows(behind: Array<number | null>): Row[] {
  return targets.map((target, index) => ({
    target,
    live,
    latest: live,
    behind: behind[index] ?? 0,
    touched: 0,
  }));
}

describe("parseSelection", () => {
  test("picks the projects behind master on an empty answer", () => {
    expect(parseSelection("", rows([2, 0, 1]))?.map((target) => target.label)).toEqual([
      "dashboard",
      "api",
    ]);
  });

  test("accepts numbers and names in any mix, once each", () => {
    const picked = parseSelection("3, docs 3", rows([0, 0, 0]));
    expect(picked?.map((target) => target.label)).toEqual(["api", "docs"]);
  });

  test("accepts the Vercel project name", () => {
    expect(parseSelection("v2.dashboard", rows([0, 0, 0]))?.[0]?.label).toBe("dashboard");
  });

  test("picks every project on all", () => {
    expect(parseSelection("all", rows([0, 0, 0]))).toHaveLength(3);
  });

  test("rejects an unknown choice", () => {
    expect(parseSelection("4", rows([0, 0, 0]))).toBeNull();
    expect(parseSelection("web", rows([0, 0, 0]))).toBeNull();
  });
});

describe("isBehind", () => {
  test("counts a project without a live deployment or a known commit as behind", () => {
    const [row] = rows([0]);
    if (!row) throw new Error("no row");
    expect(isBehind({ ...row, live: null })).toBe(true);
    expect(isBehind({ ...row, behind: null })).toBe(true);
    expect(isBehind(row)).toBe(false);
  });
});

describe("formatAge", () => {
  test("uses the largest fitting unit", () => {
    expect(formatAge(0, 30_000)).toBe("30s");
    expect(formatAge(0, 12 * 60_000)).toBe("12m");
    expect(formatAge(0, 5 * 3_600_000)).toBe("5h");
    expect(formatAge(0, 3 * 86_400_000)).toBe("3d");
  });
});

describe("toDeployment", () => {
  test("reads a project's targets.production", () => {
    expect(
      toDeployment({
        id: "dpl_1",
        url: "a.vercel.app",
        readyState: "READY",
        createdAt: 5,
        meta: { githubCommitSha: "abc" },
      }),
    ).toEqual({
      id: "dpl_1",
      url: "a.vercel.app",
      state: "READY",
      sha: "abc",
      created: 5,
      inspector: null,
    });
  });

  test("reads a /v6/deployments item", () => {
    expect(toDeployment({ uid: "dpl_2", state: "CANCELED", created: 7 })?.state).toBe("CANCELED");
  });

  test("returns null without an id", () => {
    expect(toDeployment(undefined)).toBeNull();
    expect(toDeployment({ url: "a" })).toBeNull();
  });
});
