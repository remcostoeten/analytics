import type { CSSProperties, ReactNode } from "react";

import { CopyButton } from "./copy-button";
import { FileIcon } from "./icons";

type GutterStyle = CSSProperties & { "--gutter": string };

export type CodeFrameFile = {
  id: string;
  title: string;
};

type Props = {
  files: CodeFrameFile[];
  active: string;
  lang: string;
  code: string;
  onSelect?: (id: string) => void;
  wrap?: boolean;
  children: ReactNode;
};

function FileName({ title }: { title: string }) {
  const slash = title.lastIndexOf("/") + 1;
  return (
    <>
      <FileIcon className="size-3.5 shrink-0 text-accent" />
      <span className="truncate">
        <span className="text-muted">{title.slice(0, slash)}</span>
        <span className="text-fg">{title.slice(slash)}</span>
      </span>
    </>
  );
}

function TabName({ title }: { title: string }) {
  const name = title.slice(title.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  return (
    <>
      <FileIcon className="hidden size-3.5 shrink-0 text-accent sm:block" />
      <span className="flex min-w-0 text-fg">
        <span className="truncate">{stem}</span>
        <span className="shrink-0">{extension}</span>
      </span>
    </>
  );
}

export function CodeFrame({ files, active, lang, code, onSelect, wrap = false, children }: Props) {
  const source = code.trimEnd();
  const gutter: GutterStyle = { "--gutter": `${String(source.split("\n").length).length}ch` };
  const current = files.find((file) => file.id === active) ?? files[0];
  const tab = "relative flex min-w-0 items-center gap-2 py-2.5 font-mono";

  return (
    <div
      className={`code-window min-w-0 overflow-hidden rounded-[10px] border border-line ${wrap ? "code-wrap" : ""}`}
      style={gutter}
    >
      <div className="flex items-stretch justify-between border-b border-dashed border-line pr-2">
        {onSelect ? (
          <div
            role="tablist"
            aria-label="Language"
            className="flex min-w-0 overflow-x-auto [scrollbar-width:none]"
          >
            {files.map((file) => {
              const selected = file.id === current.id;
              return (
                <button
                  key={file.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  title={file.title}
                  onClick={() => onSelect(file.id)}
                  className={`${tab} px-2 text-[0.68rem] transition-opacity duration-200 sm:shrink-0 sm:px-4 sm:text-[0.72rem] ${selected ? "" : "opacity-55 hover:opacity-90"}`}
                >
                  <TabName title={file.title} />
                  {selected ? (
                    <span className="absolute inset-x-0 -bottom-px h-px bg-accent" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <span className={`${tab} px-4 text-[0.72rem]`}>
            <FileName title={current.title} />
            <span className="absolute inset-x-0 -bottom-px h-px bg-accent" />
          </span>
        )}
        <div className="flex shrink-0 items-center gap-2 pl-2">
          <span className={`caps text-[0.62rem] text-muted ${onSelect ? "hidden sm:inline" : ""}`}>
            {lang}
          </span>
          <CopyButton text={source} label={`Copy ${current.title}`} />
        </div>
      </div>
      {children}
    </div>
  );
}
