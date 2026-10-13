"use client";

import { MoonIcon, SunIcon } from "@/shared/ui/icons";

import { setTheme, useTheme } from "../theme-state";

export function ThemeToggle() {
  const dark = useTheme() === "dark";
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      className="theme-toggle"
      aria-pressed={dark}
      aria-label={label}
      title={label}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
    </button>
  );
}
