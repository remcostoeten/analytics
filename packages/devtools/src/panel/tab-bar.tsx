import { useLayoutEffect, useRef, useState } from "react";

import { tabs } from "./layout";
import type { Tab } from "./layout";

type Props = {
  active: Tab;
  counts: { [Name in Tab]: string };
  onPick: (tab: Tab) => void;
};

export function TabBar({ active, counts, onPick }: Props) {
  const list = useRef<HTMLDivElement>(null);
  const [clip, setClip] = useState("inset(0 100% 0 0)");

  useLayoutEffect(() => {
    const element = list.current;
    const button = element?.querySelector<HTMLElement>(`[data-tab="${active}"]`);
    if (!element || !button) return;
    const left = button.offsetLeft;
    const right = element.scrollWidth - left - button.offsetWidth;
    setClip(`inset(0 ${right}px 0 ${left}px)`);
  }, [active, counts]);

  return (
    <div className="tabs" ref={list}>
      <div role="tablist" aria-label="Buffers" className="tab-row">
        {tabs.map((tab, index) => (
          <button
            key={tab}
            type="button"
            role="tab"
            id={`ra-tab-${tab}`}
            data-tab={tab}
            aria-selected={tab === active}
            aria-controls="ra-panel"
            tabIndex={tab === active ? 0 : -1}
            className="tab"
            onClick={() => onPick(tab)}
          >
            <span className="key">{index + 1}</span>
            {tab}
            <span className="n">{counts[tab]}</span>
          </button>
        ))}
      </div>
      <div className="tab-row tab-active" aria-hidden="true" style={{ clipPath: clip }}>
        {tabs.map((tab, index) => (
          <span key={tab} className="tab">
            <span className="key">{index + 1}</span>
            {tab}
            <span className="n">{counts[tab]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
