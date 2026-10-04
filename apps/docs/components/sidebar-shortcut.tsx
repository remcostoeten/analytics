"use client";

import { useSidebar } from "fumadocs-ui/components/sidebar/base";
import { useEffect } from "react";

export function SidebarShortcut() {
  const { mode, setOpen, setCollapsed } = useSidebar();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() !== "b" || !(event.metaKey || event.ctrlKey)) return;
      if (event.shiftKey || event.altKey || event.defaultPrevented) return;
      if (event.target instanceof HTMLElement && event.target.isContentEditable) return;
      event.preventDefault();
      if (mode === "drawer") setOpen((open) => !open);
      else setCollapsed((collapsed) => !collapsed);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, setOpen, setCollapsed]);

  return null;
}
