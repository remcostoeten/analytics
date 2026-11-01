import type { Nullable } from "@spoar/shared/semantic";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { badgeBoxes, clickMarks } from "./click-marks";
import type { BadgeBox } from "./click-marks";

type Props = { counts: Map<string, number> };

function viewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function ClickOverlay({ counts }: Props) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [target, setTarget] = useState<Nullable<ShadowRoot | HTMLElement>>(null);
  const [boxes, setBoxes] = useState<BadgeBox[]>([]);

  useEffect(() => {
    const root = anchor.current?.getRootNode();
    setTarget(root instanceof ShadowRoot ? root : document.body);
  }, []);

  useEffect(() => {
    let frame: Nullable<number> = null;
    function measure() {
      frame = null;
      setBoxes(badgeBoxes(clickMarks(document), counts, viewport()));
    }
    function schedule() {
      if (frame === null) frame = requestAnimationFrame(measure);
    }
    measure();
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-spoar-click", "data-ra-click"],
    });
    window.addEventListener("scroll", schedule, { capture: true, passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [counts]);

  return (
    <span ref={anchor} hidden>
      {target
        ? createPortal(
            <div
              className="spd pointer-events-none fixed inset-0 -z-1 overflow-hidden font-console-mono text-[11px]"
              aria-hidden="true"
              data-click-overlay=""
            >
              {boxes.map((box, index) => (
                <div
                  key={`${box.label}-${index}`}
                  className="absolute rounded-[3px] outline-2 outline-offset-1 outline-console-accent outline-dashed"
                  style={{ top: box.top, left: box.left, width: box.width, height: box.height }}
                  data-click-label={box.label}
                >
                  <span className="absolute -top-2.5 -right-2.5 min-w-5 rounded-full bg-console-accent px-1.5 py-px text-center leading-4 font-medium text-white shadow-[0_2px_8px_var(--spc-shadow)]">
                    {box.count}
                  </span>
                </div>
              ))}
            </div>,
            target,
          )
        : null}
    </span>
  );
}
