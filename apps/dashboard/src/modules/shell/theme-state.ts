"use client";

import { noop } from "@spoar/shared/noop";
import type { Nullable } from "@spoar/shared/semantic";
import { useSyncExternalStore } from "react";

import { themeAttribute, themeStorageKey } from "./theme-bootstrap";

export type Theme = "light" | "dark";

const listeners = new Set<() => void>();
function systemDark() {
  return matchMedia("(prefers-color-scheme: dark)");
}

function readTheme(): Theme {
  return document.documentElement.getAttribute(themeAttribute) === "dark" ? "dark" : "light";
}

function serverTheme(): Theme {
  return "light";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.setAttribute(themeAttribute, theme);
  root.style.colorScheme = theme;
  listeners.forEach((listener) => listener());
}

function storedTheme(): Nullable<Theme> {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function preferredTheme(): Theme {
  return storedTheme() ?? (systemDark().matches ? "dark" : "light");
}

function followSystem() {
  if (storedTheme()) return;
  applyTheme(preferredTheme());
}

function followOtherTabs(event: StorageEvent) {
  if (event.key !== null && event.key !== themeStorageKey) return;
  applyTheme(preferredTheme());
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) {
    systemDark().addEventListener("change", followSystem);
    window.addEventListener("storage", followOtherTabs);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    systemDark().removeEventListener("change", followSystem);
    window.removeEventListener("storage", followOtherTabs);
  };
}

/**
 * @name setTheme
 * @description Switches the console between the light and dark palette and
 * remembers the choice under the `theme` localStorage key the docs site also
 * uses, so both apps on the origin share one preference. Notifies every mounted
 * `useTheme` subscriber. Until a choice is stored, or while the stored value is
 * `system`, the console follows the operating system setting.
 *
 * @example
 * setTheme("dark");
 */
export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    noop();
  }
  applyTheme(theme);
}

export function useTheme() {
  return useSyncExternalStore(subscribe, readTheme, serverTheme);
}
