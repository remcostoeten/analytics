import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { compileStyles, renderModule, shadowSafe } from "../scripts/build-styles";

describe("compiled styles", () => {
  test("src/styles/compiled.ts is up to date; run `bun run --cwd packages/devtools styles`", async () => {
    const current = readFileSync(
      join(import.meta.dir, "..", "src", "styles", "compiled.ts"),
      "utf8",
    );
    expect(current).toBe(renderModule(await compileStyles()));
  });

  test("shadowSafe drops @property rules and always applies the defaults", () => {
    const css =
      '@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*{--tw-blur:initial}}}@property --tw-blur{syntax:"*";inherits:false}';
    expect(shadowSafe(css)).toBe("@layer properties{*{--tw-blur:initial}}");
  });
});
