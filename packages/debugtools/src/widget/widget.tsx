import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import { Console } from "../console";
import type { ConsoleSections } from "../sections";
import type { ConsoleData, ConsoleTheme } from "../types";

type Props = {
  data?: ConsoleData;
  sections?: ConsoleSections;
  theme?: ConsoleTheme;
};

const fullHeight = { "--spc-height": "100%" } as CSSProperties;
const focusClass =
  "focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-console-muted";

function isToggle(event: KeyboardEvent) {
  return (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "k";
}

export function Widget({ data, sections, theme = "dark" }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isToggle(event)) {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        className={`spd fixed bottom-4 left-4 inline-flex h-8 items-center gap-2 rounded-full border border-console-edge bg-console-bg pr-3 pl-2.5 font-console-sans text-xs leading-none font-medium text-console-fg shadow-[0_10px_30px_-12px_var(--spc-shadow)] transition-[transform,border-color] duration-150 ease-console hover:border-console-edge-hover active:scale-[0.97] ${focusClass}`}
        aria-label="Open the debug console"
        data-theme={theme}
        onClick={() => setOpen(true)}
      >
        <span className="size-1.5 rounded-full bg-console-accent" aria-hidden="true" />
        Console
        <span
          className="font-console-mono text-[11px] text-console-dim max-[640px]:hidden"
          aria-hidden="true"
        >
          ⌃⇧K
        </span>
      </button>
    );
  }

  return (
    <div
      className="spd fixed inset-0 flex animate-console-fade items-center justify-center bg-console-scrim px-4 py-6 motion-reduce:animate-none max-[640px]:items-end max-[640px]:p-0"
      data-theme={theme}
      onClick={() => setOpen(false)}
    >
      <div
        className="relative h-[min(760px,100%)] w-[min(1200px,100%)] animate-console-sheet motion-reduce:animate-none max-[640px]:h-[88%]"
        role="dialog"
        aria-modal="true"
        aria-label="Debug console"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className={`absolute -top-3 -right-3 z-1 grid size-7 place-items-center rounded-full border border-console-edge bg-console-surface text-sm leading-none text-console-muted hover:text-console-fg max-[640px]:-top-10 max-[640px]:right-3 ${focusClass}`}
          aria-label="Close the debug console"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
        <Console
          data={data}
          sections={sections}
          theme={theme}
          style={fullHeight}
          className="shadow-[0_40px_100px_-30px_var(--spc-shadow)] max-[640px]:rounded-b-none max-[640px]:rounded-t-[14px]"
        />
      </div>
    </div>
  );
}
