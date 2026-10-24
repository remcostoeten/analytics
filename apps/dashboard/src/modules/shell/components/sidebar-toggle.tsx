"use client";

import { iconMotionHandlers } from "@/shared/ui/icon-motion";
import { PanelIcon } from "@/shared/ui/icons";

import { setSidebar, useSidebar } from "../sidebar-state";

export function SidebarToggle() {
  const collapsed = useSidebar() === "collapsed";
  const label = collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <button
      type="button"
      className="nav-item w-full text-left"
      aria-pressed={collapsed}
      aria-label={label}
      onClick={() => setSidebar(collapsed ? "expanded" : "collapsed")}
      {...iconMotionHandlers}
    >
      <PanelIcon className="size-4 shrink-0 text-muted" />
      <span className="nav-label">{collapsed ? "Expand" : "Collapse"}</span>
    </button>
  );
}
