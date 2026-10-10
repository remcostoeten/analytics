import { describe, expect, test } from "bun:test";

import { diffSteps, readStep, stepChanges } from "./tutorial";

describe("diffSteps", () => {
  test("lists added and changed files in path order and skips unchanged ones", () => {
    const changes = diffSteps(
      { "src/a.ts": "same", "src/b.ts": "old" },
      { "src/c.ts": "new", "src/a.ts": "same", "src/b.ts": "changed" },
    );
    expect(changes.map((change) => [change.name, change.before, change.after])).toEqual([
      ["src/b.ts", "old", "changed"],
      ["src/c.ts", "", "new"],
    ]);
  });

  test("places a note on the first line that contains its match", () => {
    const [change] = diffSteps({}, { "src/a.ts": "one\ntwo\ntwo" }, [
      { file: "src/a.ts", match: "two", text: "Here." },
    ]);
    expect(change?.notes).toEqual([{ line: 2, text: "Here." }]);
  });

  test("throws when a note's file or text is not in the step", () => {
    expect(() =>
      diffSteps({}, { "src/a.ts": "one" }, [{ file: "src/b.ts", match: "one", text: "" }]),
    ).toThrow();
    expect(() =>
      diffSteps({}, { "src/a.ts": "one" }, [{ file: "src/a.ts", match: "two", text: "" }]),
    ).toThrow();
  });
});

describe("tutorial steps", () => {
  test("every step changes at least one file", async () => {
    for (const step of [1, 2, 3, 4, 5, 6, 7] as const) {
      expect((await stepChanges(step)).length).toBeGreaterThan(0);
    }
  });

  test("no step removes a file the step before had", async () => {
    const pairs = [
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
    ] as const;
    for (const [previous, step] of pairs) {
      const before = Object.keys(await readStep(previous));
      const after = await readStep(step);
      expect(before.filter((name) => !(name in after))).toEqual([]);
    }
  });
});
