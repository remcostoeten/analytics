"use client";

import { PanelIcon } from "@/shared/ui/icons";

import { setSidebar, useSidebar } from "../sidebar-state";

export function SidebarToggle() {
  const collapsed = useSidebar() === "collapsed";
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <button
      type="button"
      className="sidebar-toggle"
      aria-pressed={collapsed}
      aria-label={label}
      title={label}
      onClick={() => setSidebar(collapsed ? "expanded" : "collapsed")}
    >
      <PanelIcon className="size-4" />
    </button>
  );
}
