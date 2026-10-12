import type { BaseDiffOptions } from "@pierre/diffs";

import { diffThemes } from "./diff-themes";

type DiffStyle = NonNullable<BaseDiffOptions["diffStyle"]>;

/**
 * @name diffOptions
 * @description Shared `@pierre/diffs` options for tutorial diffs, so the server prerender and the
 * client hydrate the same markup. A new file renders as plain code, a changed file gets a +/- gutter
 * and word-level highlights.
 *
 * @example
 * <FileDiff options={diffOptions(change.added, "unified")} fileDiff={fileDiff} />
 */
export function diffOptions(added: boolean, diffStyle: DiffStyle) {
  return {
    theme: diffThemes,
    diffStyle,
    overflow: "scroll",
    diffIndicators: added ? "none" : "classic",
    disableBackground: added,
    lineDiffType: "word",
  } satisfies BaseDiffOptions;
}
