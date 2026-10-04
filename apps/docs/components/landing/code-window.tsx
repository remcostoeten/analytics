import { highlight } from "fumadocs-core/highlight";
import { cacheLife } from "next/cache";
import type { CSSProperties } from "react";

import { Pre } from "@/components/code-block";
import { codeThemes } from "@/lib/code-theme";

import { CopyButton } from "./copy-button";
import { FileIcon } from "./icons";

type GutterStyle = CSSProperties & { "--gutter": string };

type CodeWindowProps = {
  title: string;
  lang: string;
  code: string;
  mark?: number[];
};

export async function CodeWindow({ title, lang, code, mark = [] }: CodeWindowProps) {
  "use cache";
  cacheLife("max");
  const source = code.trimEnd();
  const rendered = await highlight(source, {
    lang,
    themes: codeThemes,
    defaultColor: false,
    components: { pre: Pre },
    transformers: [
      {
        line(node, line) {
          if (mark.includes(line)) this.addClassToHast(node, "is-marked");
        },
      },
    ],
  });
  const slash = title.lastIndexOf("/") + 1;
  const gutter: GutterStyle = { "--gutter": `${String(source.split("\n").length).length}ch` };

  return (
    <div
      className="code-window min-w-0 overflow-hidden rounded-[10px] border border-line"
      style={gutter}
    >
      <div className="flex items-stretch justify-between border-b border-dashed border-line pr-2">
        <span className="relative flex min-w-0 items-center gap-2 px-4 py-2.5 font-mono text-[0.72rem]">
          <FileIcon className="size-3.5 shrink-0 text-accent" />
          <span className="truncate">
            <span className="text-muted">{title.slice(0, slash)}</span>
            <span className="text-fg">{title.slice(slash)}</span>
          </span>
          <span className="absolute inset-x-0 -bottom-px h-px bg-accent" />
        </span>
        <div className="flex items-center gap-2">
          <span className="caps text-[0.62rem] text-muted">{lang}</span>
          <CopyButton text={source} label={`Copy ${title}`} />
        </div>
      </div>
      {rendered}
    </div>
  );
}
