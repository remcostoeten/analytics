import { useEffect, useState } from "react";

import type { ConsoleHost } from "../host";

type Props = { host: ConsoleHost };

export function VisitsSwitch({ host }: Props) {
  const [counted, setCounted] = useState(() => !host.isOptedOut());

  useEffect(() => {
    function sync() {
      setCounted(!host.isOptedOut());
    }
    sync();
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [host]);

  function toggle() {
    if (counted) host.optOut();
    else host.optIn();
    setCounted(!host.isOptedOut());
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={counted}
      title={
        counted
          ? "Visits from this browser are counted on this site"
          : "Visits from this browser are not counted on this site"
      }
      className="group inline-flex h-6.5 items-center gap-2 rounded-[5px] px-1.5 whitespace-nowrap text-console-muted transition-colors duration-[120ms] hover:bg-console-hover hover:text-console-fg"
      onClick={toggle}
    >
      <span className="relative h-3.5 w-6 flex-none rounded-full border border-console-line bg-console-surface transition-colors duration-[120ms] group-aria-checked:border-console-fg group-aria-checked:bg-console-fg">
        <span className="absolute top-px left-px size-2.5 rounded-full bg-console-dim transition-transform duration-[160ms] group-aria-checked:translate-x-2.5 group-aria-checked:bg-console-bg" />
      </span>
      Count my visits
    </button>
  );
}
