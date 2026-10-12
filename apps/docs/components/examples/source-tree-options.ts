import type { FileTreeOptions } from "@pierre/trees";

/**
 * @name sourceTreeOptions
 * @description The file tree options for an example's sources, shared by the server preload and
 * the client model so the hydrated tree matches the prerendered one. The first file starts
 * selected and every folder starts open.
 *
 * @example
 * preloadFileTree(sourceTreeOptions(["src/app.tsx", "package.json"]));
 */
export function sourceTreeOptions(paths: readonly string[]) {
  return {
    id: "example-sources",
    paths,
    initialExpansion: "open",
    initialSelectedPaths: paths.slice(0, 1),
    icons: { set: "complete", colored: true },
    density: "compact",
  } satisfies FileTreeOptions;
}
