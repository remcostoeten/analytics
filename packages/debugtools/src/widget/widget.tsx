import { useEffect, useState } from "react";

import { Console } from "../console";
import type { ConsoleData } from "../types";

type Props = {
  data?: ConsoleData;
};

function isToggle(event: KeyboardEvent) {
  return (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "k";
}

export function Widget({ data }: Props) {
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
        className="spd-launcher"
        aria-label="Open the debug console"
        onClick={() => setOpen(true)}
      >
        <span className="spd-dot" aria-hidden="true" />
        Console
        <span className="spd-keys" aria-hidden="true">
          ⌃⇧K
        </span>
      </button>
    );
  }

  return (
    <div className="spd-backdrop" onClick={() => setOpen(false)}>
      <div
        className="spd-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Debug console"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="spd-close"
          aria-label="Close the debug console"
          onClick={() => setOpen(false)}
        >
          ×
        </button>
        <Console data={data} />
      </div>
    </div>
  );
}
