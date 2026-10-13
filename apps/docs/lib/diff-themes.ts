import { registerCustomTheme } from "@pierre/diffs";

import { codeThemes } from "./code-theme";

let registered = false;

/**
 * @name diffThemes
 * @description The site's code theme names for `@pierre/diffs`, so tutorial diffs match the other
 * code blocks. Call `registerDiffThemes` before the first diff renders.
 *
 * @example
 * <FileDiff options={{ theme: diffThemes }} fileDiff={fileDiff} />
 */
export const diffThemes = { light: codeThemes.light.name, dark: codeThemes.dark.name };

/**
 * @name registerDiffThemes
 * @description Registers the site's code themes with `@pierre/diffs` once per module graph.
 *
 * @example
 * registerDiffThemes();
 */
export function registerDiffThemes() {
  if (registered) return;
  registered = true;
  registerCustomTheme(codeThemes.light.name, async () => codeThemes.light);
  registerCustomTheme(codeThemes.dark.name, async () => codeThemes.dark);
}
