import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { compileStyles, renderModule, scopeTheme, shadowSafe } from "../scripts/build-styles";

describe("compiled styles", () => {
  test("src/styles/compiled.ts is up to date; run `bun run --cwd packages/debugtools styles`", async () => {
    const current = readFileSync(
      join(import.meta.dir, "..", "src", "styles", "compiled.ts"),
      "utf8",
    );
    expect(current).toBe(renderModule(await compileStyles()));
  });

  test("uses plain Tailwind utilities and keeps theme variables off the host root", async () => {
    const css = await compileStyles();
    expect(css).toContain(".flex{");
    expect(css).toContain(".bg-console-bg{");
    expect(css).not.toContain(":root");
    expect(css).toContain(":host,.spc-console,.spd{");
  });

  test("ships a light palette for the light and system themes", async () => {
    const css = await compileStyles();
    expect(css).toMatch(/\[data-theme="?light"?\]/);
    expect(css).toMatch(/prefers-color-scheme:\s*light/);
    expect(css).toMatch(/\[data-theme="?system"?\]/);
  });

  test("scopeTheme moves theme variables onto the console roots", () => {
    expect(scopeTheme("@layer theme{:root,:host{--spacing:.25rem}}")).toBe(
      "@layer theme{:host,.spc-console,.spd{--spacing:.25rem}}",
    );
  });

  test("shadowSafe drops @property rules and always applies the defaults", () => {
    const css =
      '@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*{--tw-blur:initial}}}@property --tw-blur{syntax:"*";inherits:false}';
    expect(shadowSafe(css)).toBe("@layer properties{*{--tw-blur:initial}}");
  });
});
