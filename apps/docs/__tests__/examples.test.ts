import { describe, expect, test } from "bun:test";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { listExamples } from "../lib/examples";

const examplesRoot = join(import.meta.dir, "..", "..", "..", "examples");

function missingPaths() {
  return listExamples().flatMap((example) => {
    const directory = join(examplesRoot, example.directory);
    if (!existsSync(directory) || !statSync(directory).isDirectory()) return [example.directory];
    return example.files
      .filter((file) => !existsSync(join(directory, file)))
      .map((file) => `${example.directory}/${file}`);
  });
}

describe("examples registry", () => {
  test("every entry points at an existing directory and files", () => {
    expect(missingPaths()).toEqual([]);
  });

  test("slugs are unique", () => {
    const slugs = listExamples().map((example) => example.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  test("every entry lists at least one file", () => {
    expect(listExamples().filter((example) => example.files.length === 0)).toEqual([]);
  });
});
