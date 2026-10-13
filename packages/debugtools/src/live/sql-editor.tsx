import { useRef } from "react";
import type { KeyboardEvent, RefObject } from "react";

import { CodeLine } from "../parts/code-line";

type Props = {
  value: string;
  keywords: ReadonlySet<string>;
  fill: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onChange: (value: string) => void;
  onRun: () => void;
};

const layerClass =
  "col-start-1 row-start-1 m-0 min-h-full overflow-auto pr-3.5 pl-3.5 whitespace-pre [scrollbar-width:none]";

function indent(target: HTMLTextAreaElement, onChange: (value: string) => void) {
  const { selectionStart, selectionEnd, value } = target;
  onChange(`${value.slice(0, selectionStart)}  ${value.slice(selectionEnd)}`);
  requestAnimationFrame(() => target.setSelectionRange(selectionStart + 2, selectionStart + 2));
}

export function SqlEditor({ value, keywords, fill, inputRef, onChange, onRun }: Props) {
  const mirror = useRef<HTMLPreElement>(null);
  const gutter = useRef<HTMLDivElement>(null);
  const lines = value.split("\n");

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      onRun();
      return;
    }
    if (event.key === "Tab" && !event.shiftKey) {
      event.preventDefault();
      indent(event.currentTarget, onChange);
    }
  }

  return (
    <div
      className={`relative flex overflow-hidden border-b border-console-divider py-2.5 font-console-mono text-[12.5px] leading-5 @max-[520px]:text-[11.5px] ${fill ? "min-h-35 flex-1" : "h-35 flex-none"}`}
    >
      <div
        ref={gutter}
        className="flex w-13 flex-none flex-col overflow-hidden pr-2 pl-2.5 text-right text-console-dim"
        aria-hidden="true"
      >
        {lines.map((_, index) => (
          <span key={index} className="pr-2.5">
            {index + 1}
          </span>
        ))}
      </div>
      <div className="grid min-w-0 flex-1">
        <pre ref={mirror} className={`${layerClass} pointer-events-none`} aria-hidden="true">
          {lines.map((line, index) => (
            <div key={index} className="min-h-5">
              <CodeLine line={line} keywords={keywords} />
            </div>
          ))}
        </pre>
        <textarea
          ref={inputRef}
          className={`${layerClass} resize-none bg-transparent text-transparent caret-console-fg outline-none placeholder:text-console-dim selection:bg-console-raised selection:text-transparent`}
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          aria-label="SQL query"
          placeholder="select count(*) from events where ts >= :from"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          onScroll={(event) => {
            const { scrollTop, scrollLeft } = event.currentTarget;
            if (gutter.current) gutter.current.scrollTop = scrollTop;
            if (!mirror.current) return;
            mirror.current.scrollTop = scrollTop;
            mirror.current.scrollLeft = scrollLeft;
          }}
        />
      </div>
    </div>
  );
}
