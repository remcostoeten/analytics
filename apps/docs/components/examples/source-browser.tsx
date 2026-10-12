import { preloadFile } from "@pierre/diffs/ssr";
import { preloadFileTree } from "@pierre/trees/ssr";
import { cacheLife } from "next/cache";

import { pierreThemes } from "@/lib/diff-themes";

import { SourceBrowserView } from "./source-browser-view";
import type { PreloadedSource } from "./source-browser-view";
import { sourceTreeOptions } from "./source-tree-options";

type Props = {
  files: { name: string; contents: string }[];
};

async function preloadSources(files: Props["files"]): Promise<PreloadedSource[]> {
  "use cache";
  cacheLife("max");
  return Promise.all(
    files.map(async (file) => {
      const contents = file.contents.trimEnd();
      const preloaded = await preloadFile({
        file: { name: file.name, contents },
        options: { theme: pierreThemes, overflow: "wrap", disableFileHeader: true },
      });
      return {
        name: file.name,
        contents,
        lines: contents.split("\n").length,
        prerenderedHTML: preloaded.prerenderedHTML,
      };
    }),
  );
}

export async function SourceBrowser({ files }: Props) {
  const sources = await preloadSources(files);
  const { id, shadowHtml } = preloadFileTree(
    sourceTreeOptions(sources.map((source) => source.name)),
  );
  return <SourceBrowserView sources={sources} tree={{ id, shadowHtml }} />;
}
