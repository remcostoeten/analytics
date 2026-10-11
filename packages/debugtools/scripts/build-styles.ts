import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import tailwind from "@tailwindcss/postcss";
import postcss from "postcss";

const root = join(import.meta.dir, "..");
const source = join(root, "src", "styles", "console.css");
const themeSource = join(root, "src", "styles", "theme.css");
const target = join(root, "src", "styles", "compiled.ts");
const dist = join(root, "dist");

// Matches the @supports guard Tailwind puts around its custom property defaults.
const supportsGuard = /@supports\s*\(\(\(-webkit-hyphens:\s*none\)\)[^{]*\)\s*\{([\s\S]*?\})\s*\}/;
// Matches one @property rule, which Chromium ignores inside a shadow root.
const propertyRule = /@property\s+--[\w-]+\s*\{[^}]*\}/g;
// Matches the selector Tailwind puts on its theme variables.
const themeSelector = /:root,:host\{/g;

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
 * @name scopeTheme
 * @description Moves Tailwind's theme variables from `:root` onto the console roots, so a host
 * page that loads the stylesheet keeps its own `--spacing`, radii and type scale.
 *
 * @example
 * scopeTheme(":root,:host{--spacing:.25rem}");
 * // ":host,.spc-console,.spd{--spacing:.25rem}"
 */
export function scopeTheme(css: string): string {
  return css.replace(themeSelector, ":host,.spc-console,.spd{");
}

/**
 * @name compileStyles
 * @description Compiles `src/styles/console.css` with Tailwind v4, minified, shadow safe and
 * with its theme variables scoped to the console.
 *
 * @example
 * const css = await compileStyles();
 */
export async function compileStyles(): Promise<string> {
  const result = await postcss([tailwind({ base: root, optimize: { minify: true } })]).process(
    readFileSync(source, "utf8"),
    { from: source },
  );
  return scopeTheme(shadowSafe(result.css));
}

/**
 * @name renderModule
 * @description The source of `compiled.ts` for a compiled stylesheet.
 *
 * @example
 * writeFileSync(target, renderModule(await compileStyles()));
 */
export function renderModule(css: string): string {
  return `export const css = ${JSON.stringify(css)};\n`;
}

/**
 * @name renderTailwindEntry
 * @description The source of `dist/tailwind.css`: the console's theme tokens and base styles,
 * plus an `@source` on the built files, for hosts that compile the console with their own Tailwind.
 *
 * @example
 * writeFileSync(join(dist, "tailwind.css"), renderTailwindEntry());
 */
export function renderTailwindEntry(): string {
  return `@source "./";\n@source not inline("collapse container");\n\n${readFileSync(themeSource, "utf8")}`;
}

if (import.meta.main) {
  const css = await compileStyles();
  writeFileSync(target, renderModule(css));
  console.log(`Wrote ${target}`);
  if (process.argv.includes("--dist")) {
    mkdirSync(dist, { recursive: true });
    writeFileSync(join(dist, "styles.css"), css);
    writeFileSync(join(dist, "tailwind.css"), renderTailwindEntry());
    console.log(`Wrote ${join(dist, "styles.css")} and ${join(dist, "tailwind.css")}`);
  }
}
