import type { ConsoleTab } from "../options";
import { tabLabels } from "./view";

type Props = {
  tabs: ConsoleTab[];
  active: ConsoleTab;
  onSelect: (tab: ConsoleTab) => void;
};

const tabClass =
  "border-b-2 border-transparent px-3 py-1.5 text-console-dim hover:text-console-fg aria-selected:border-console-accent aria-selected:text-console-fg";

export function TabBar({ tabs, active, onSelect }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Console views"
      className="flex flex-none items-center border-b border-console-divider px-1 font-console-sans text-xs"
    >
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === active}
          className={tabClass}
          onClick={() => onSelect(tab)}
        >
          {tabLabels[tab]}
        </button>
      ))}
    </div>
  );
}
