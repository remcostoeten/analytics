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
  children: ReactNode;
};

function FileName({ title, short = false }: { title: string; short?: boolean }) {
  const slash = title.lastIndexOf("/") + 1;
  return (
    <>
      <FileIcon className="size-3.5 shrink-0 text-accent" />
      <span className="truncate">
        {short ? null : <span className="text-muted">{title.slice(0, slash)}</span>}
        <span className="text-fg">{title.slice(slash)}</span>
      </span>
    </>
  );
}

export function CodeFrame({ files, active, lang, code, onSelect, children }: Props) {
  const source = code.trimEnd();
  const gutter: GutterStyle = { "--gutter": `${String(source.split("\n").length).length}ch` };
  const current = files.find((file) => file.id === active) ?? files[0];
  const tab = "relative flex min-w-0 items-center gap-2 px-4 py-2.5 font-mono text-[0.72rem]";

  return (
    <div
      className="code-window min-w-0 overflow-hidden rounded-[10px] border border-line"
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
                  onClick={() => onSelect(file.id)}
                  className={`${tab} shrink-0 transition-opacity duration-200 ${selected ? "" : "opacity-55 hover:opacity-90"}`}
                >
                  <FileName title={file.title} short />
                  {selected ? (
                    <span className="absolute inset-x-0 -bottom-px h-px bg-accent" />
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <span className={tab}>
            <FileName title={current.title} />
            <span className="absolute inset-x-0 -bottom-px h-px bg-accent" />
          </span>
        )}
        <div className="flex shrink-0 items-center gap-2 pl-2">
          <span className="caps text-[0.62rem] text-muted">{lang}</span>
          <CopyButton text={source} label={`Copy ${current.title}`} />
        </div>
      </div>
      {children}
    </div>
  );
}
