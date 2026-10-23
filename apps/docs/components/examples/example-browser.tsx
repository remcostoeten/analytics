"use client";

import type { FileTreePreloadedData } from "@pierre/trees/react";
import { FileTree, useFileTree } from "@pierre/trees/react";
import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { CodeFrame } from "@/components/landing/code-frame";

export type ExampleFile = {
  path: string;
  lang: string;
  code: string;
  rendered: ReactNode;
};

type Props = {
  id: string;
  files: ExampleFile[];
  preloaded?: FileTreePreloadedData;
};

type TreeVariables = CSSProperties & Record<`--trees-${string}`, string>;

const treeStyle: TreeVariables = {
  colorScheme: "inherit",
  "--trees-font-family-override": "var(--mono)",
  "--trees-font-size-override": "0.72rem",
  "--trees-bg-override": "transparent",
  "--trees-fg-override": "var(--fg)",
  "--trees-fg-muted-override": "var(--muted)",
  "--trees-border-color-override": "var(--line)",
  "--trees-indent-guide-bg-override": "var(--line)",
  "--trees-selected-bg-override": "color-mix(in srgb, var(--accent) 12%, transparent)",
  "--trees-selected-fg-override": "var(--fg)",
  "--trees-selected-focused-border-color-override": "var(--accent)",
  "--trees-accent-override": "var(--accent)",
  "--trees-focus-ring-color-override": "var(--accent)",
  "--trees-scrollbar-thumb-override": "var(--line)",
  "--trees-search-bg-override": "var(--bg)",
  "--trees-search-fg-override": "var(--fg)",
  "--trees-input-bg-override": "var(--bg)",
};

export function ExampleBrowser({ id, files, preloaded }: Props) {
  const [active, setActive] = useState(files[0]?.path ?? "");
  const { model } = useFileTree({
    id,
    paths: files.map((file) => file.path),
    initialExpansion: "open",
    initialSelectedPaths: active ? [active] : [],
    search: true,
    onSelectionChange: (selected) => {
      const next = selected.find((path) => files.some((file) => file.path === path));
      if (next) setActive(next);
    },
  });
  const current = files.find((file) => file.path === active) ?? files[0];
  if (!current) return null;

  return (
    <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <FileTree
        model={model}
        preloadedData={preloaded}
        aria-label="Example files"
        style={treeStyle}
        className="code-window block h-[240px] overflow-hidden rounded-[10px] border border-line py-1.5 lg:sticky lg:top-20 lg:h-[560px]"
      />
      <div className="min-w-0">
        <CodeFrame
          files={[{ id: current.path, title: current.path }]}
          active={current.path}
          lang={current.lang}
          code={current.code}
        >
          {current.rendered}
        </CodeFrame>
      </div>
    </div>
  );
}
