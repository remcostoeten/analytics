"use client";

import { File } from "@pierre/diffs/react";
import type { FileTreePreloadedData } from "@pierre/trees/react";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { useState } from "react";
import type { CSSProperties } from "react";

import { CopyButton } from "@/components/landing/copy-button";
import { pierreThemes } from "@/lib/diff-themes";

import { sourceTreeOptions } from "./source-tree-options";

export type PreloadedSource = {
  name: string;
  contents: string;
  lines: number;
  prerenderedHTML: string;
};

type Props = {
  sources: PreloadedSource[];
  tree: FileTreePreloadedData;
};

type SourceVariables = CSSProperties & {
  "--diffs-font-family": string;
  "--diffs-font-size": string;
};

const sourceStyle: SourceVariables = {
  colorScheme: "inherit",
  "--diffs-font-family": "var(--font-mono)",
  "--diffs-font-size": "13px",
};

const treeStyle: CSSProperties = { height: "100%", colorScheme: "inherit" };

export function SourceBrowserView({ sources, tree }: Props) {
  const names = sources.map((source) => source.name);
  const [activeName, setActiveName] = useState(names[0] ?? "");
  const { model } = useFileTree({
    ...sourceTreeOptions(names),
    onSelectionChange: (paths) => {
      const file = paths.findLast((path) => names.includes(path));
      if (file) setActiveName(file);
    },
  });
  const active = sources.find((source) => source.name === activeName) ?? sources[0];
  if (!active) return null;

  return (
    <div className="grid min-w-0 overflow-clip rounded-xl border border-line md:h-[min(44rem,calc(100vh-8rem))] md:grid-cols-[16rem_minmax(0,1fr)]">
      <div className="h-56 min-w-0 border-b border-line md:h-auto md:border-r md:border-b-0">
        <FileTree model={model} preloadedData={tree} style={treeStyle} />
      </div>
      <section aria-label={active.name} className="flex min-h-0 min-w-0 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line py-2 pr-2 pl-4">
          <p className="m-0 min-w-0 truncate font-mono text-[0.75rem] text-fg">{active.name}</p>
          <div className="flex shrink-0 items-center gap-3">
            <span className="font-mono text-[0.68rem] text-muted tabular-nums">
              {active.lines} lines
            </span>
            <CopyButton text={active.contents} label={`Copy ${active.name}`} />
          </div>
        </header>
        <div key={active.name} className="min-h-0 flex-1 overflow-auto">
          <File
            file={{ name: active.name, contents: active.contents }}
            prerenderedHTML={active.prerenderedHTML}
            options={{ theme: pierreThemes, overflow: "wrap", disableFileHeader: true }}
            style={sourceStyle}
          />
        </div>
      </section>
    </div>
  );
}
