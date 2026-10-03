import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import tailwind from "@tailwindcss/postcss";
import postcss from "postcss";

const root = join(import.meta.dir, "..");
const source = join(root, "src", "styles", "panel.css");
const target = join(root, "src", "styles", "compiled.ts");
const font = join(
  root,
  "node_modules",
  "@fontsource-variable",
  "jetbrains-mono",
  "files",
  "jetbrains-mono-latin-wght-normal.woff2",
);

// Matches the @supports guard Tailwind puts around its custom property defaults.
const supportsGuard = /@supports\s*\(\(\(-webkit-hyphens:\s*none\)\)[^{]*\)\s*\{([\s\S]*?\})\s*\}/;
// Matches one @property rule, which Chromium ignores inside a shadow root.
const propertyRule = /@property\s+--[\w-]+\s*\{[^}]*\}/g;

/**
 * @name shadowSafe
 * @description Rewrites compiled Tailwind CSS for a shadow root: registered custom properties
 * are ignored there, so the fallback defaults Tailwind guards behind `@supports` always apply.
 *
 * @example
 * shadowSafe(css);
 */
export function shadowSafe(css: string): string {
  return css.replace(supportsGuard, "$1").replace(propertyRule, "");
}

/**
 * @name compileStyles
 * @description Compiles `src/styles/panel.css` with Tailwind v4, minified, and returns it with
 * the JetBrains Mono latin variable font as base64, ready to write to `compiled.ts`.
 *
 * @example
 * const { css, font } = await compileStyles();
 */
export async function compileStyles() {
  const result = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(
    readFileSync(source, "utf8"),
    { from: source },
  );
  return {
    css: shadowSafe(result.css),
    font: readFileSync(font).toString("base64"),
  };
}

/**
 * @name renderModule
 * @description The source of `compiled.ts` for compiled styles.
 *
 * @example
 * writeFileSync(target, renderModule(await compileStyles()));
 */
export function renderModule(styles: { css: string; font: string }) {
  return [
    `export const css = ${JSON.stringify(styles.css)};`,
    "",
    `export const font = ${JSON.stringify(styles.font)};`,
    "",
  ].join("\n");
}

if (import.meta.main) {
  writeFileSync(target, renderModule(await compileStyles()));
  console.log(`Wrote ${target}`);
}
