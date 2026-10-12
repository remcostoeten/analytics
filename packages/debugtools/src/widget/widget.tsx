import type { Nullable } from "@spoar/shared/semantic";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

import { Console } from "../console";
import { LiveConsole } from "../live/live-console";
import { Panel } from "../panel/panel";
import type { LauncherSide } from "../options";
import type { ConsoleSections } from "../sections";
import type { ConsoleSource } from "../source";
import type { ConsoleData, ConsoleTheme } from "../types";

type Props = {
  label?: string;
  source?: Nullable<ConsoleSource>;
  data?: ConsoleData;
  sections?: ConsoleSections;
  theme?: ConsoleTheme;
  launcher?: LauncherSide;
  open?: boolean;
};

const fullHeight = { "--spc-height": "100%" } as CSSProperties;
const embeddedClass = "rounded-none border-0";
const focusClass =
  "focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-console-muted";

function isToggle(event: KeyboardEvent) {
  return (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "k";
}

function typing(event: KeyboardEvent) {
  const target = event.composedPath()[0];
  return target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;
}

export function Widget({
  label = "",
  source,
  data,
  sections,
  theme = "dark",
  launcher = "left",
  open: initial = false,
}: Props) {
  const [open, setOpen] = useState(initial);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (isToggle(event)) {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }
      if (event.key === "Escape" && !typing(event)) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        className={`spd fixed bottom-4 ${launcher === "right" ? "right-4" : "left-4"} inline-flex h-8 items-center gap-2 rounded-full border border-console-edge bg-console-bg pr-3 pl-2.5 font-console-sans text-xs leading-none font-medium text-console-fg shadow-[0_10px_30px_-12px_var(--spc-shadow)] transition-[transform,border-color] duration-150 ease-console hover:border-console-edge-hover active:scale-[0.97] ${focusClass}`}
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
    <Panel label={label} theme={theme} onClose={() => setOpen(false)}>
      {source && !data ? (
        <LiveConsole
          source={source}
          sections={sections}
          theme={theme}
          style={fullHeight}
          className={embeddedClass}
        />
      ) : (
        <Console
          data={data}
          sections={sections}
          theme={theme}
          style={fullHeight}
          className={embeddedClass}
        />
      )}
    </Panel>
  );
}
