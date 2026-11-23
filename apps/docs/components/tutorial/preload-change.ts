import { parseDiffFromFile } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs/ssr";
import { preloadFileDiff } from "@pierre/diffs/ssr";

import { diffOptions } from "@/lib/diff-options";
import { registerDiffThemes } from "@/lib/diff-themes";
import type { StepChange } from "@/lib/tutorial";

import type { PreloadedChange } from "./step-diff-view";

registerDiffThemes();

/**
 * @name preloadChange
 * @description Parses one file change and prerenders its unified `@pierre/diffs` markup on the
 * server. An empty `before` renders the file as new.
 *
 * @example
 * const change = await preloadChange({ name: "a.ts", before: "", after: "x", notes: [] });
 */
export async function preloadChange(change: StepChange): Promise<PreloadedChange> {
  const added = change.before === "";
  const fileDiff = parseDiffFromFile(
    added ? null : { name: change.name, contents: change.before },
    { name: change.name, contents: change.after },
  );
  const annotations: DiffLineAnnotation<{ text: string }>[] = change.notes.map((note) => ({
    side: "additions",
    lineNumber: note.line,
    metadata: { text: note.text },
  }));
  const preloaded = await preloadFileDiff<{ text: string }>({
    fileDiff,
    options: diffOptions(added, "unified"),
    annotations,
  });
  return {
    name: change.name,
    added,
    fileDiff,
    annotations,
    prerenderedHTML: preloaded.prerenderedHTML,
  };
}
