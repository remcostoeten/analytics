"use client";

import { useSyncExternalStore } from "react";

import { type FontStyle, fontStorageKey, fontStyles } from "@/lib/font-style";

const changeEvent = "spoar-font-change";

function subscribe(onChange: () => void) {
  window.addEventListener(changeEvent, onChange);
  return () => window.removeEventListener(changeEvent, onChange);
}

function readFont(): FontStyle {
  const value = document.documentElement.dataset.font;
  return fontStyles.some((style) => style.value === value) ? (value as FontStyle) : "geist";
}

function readServerFont(): FontStyle {
  return "geist";
}

function saveFont(font: FontStyle) {
  try {
    localStorage.setItem(fontStorageKey, font);
    return true;
  } catch {
    return false;
  }
}

function applyFont(font: FontStyle) {
  if (font === "geist") delete document.documentElement.dataset.font;
  else document.documentElement.dataset.font = font;
  saveFont(font);
  window.dispatchEvent(new Event(changeEvent));
}

export function FontPicker() {
  const font = useSyncExternalStore(subscribe, readFont, readServerFont);

  return (
    <label className="mt-2 flex items-center gap-2 rounded-lg border bg-fd-secondary/50 px-2 py-1 text-xs text-fd-muted-foreground">
      <span className="caps text-[0.62rem] tracking-[0.04em]">Font</span>
      <select
        value={font}
        onChange={(event) => applyFont(event.target.value as FontStyle)}
        className="ms-auto cursor-pointer bg-transparent text-fd-foreground outline-none"
        aria-label="Font style"
      >
        {fontStyles.map((style) => (
          <option key={style.value} value={style.value} className="bg-fd-popover">
            {style.label}
          </option>
        ))}
      </select>
    </label>
  );
}
