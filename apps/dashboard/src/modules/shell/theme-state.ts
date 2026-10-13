"use client";

import { noop } from "@spoar/shared/noop";
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
  document.documentElement.setAttribute(themeAttribute, theme);
  listeners.forEach((listener) => listener());
}

function storedTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(themeStorageKey);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function followSystem(event: MediaQueryListEvent) {
  if (storedTheme()) return;
  applyTheme(event.matches ? "dark" : "light");
}

function subscribe(listener: () => void) {
  if (listeners.size === 0) systemDark().addEventListener("change", followSystem);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) systemDark().removeEventListener("change", followSystem);
  };
}

/**
 * @name setTheme
 * @description Switches the console between the light and dark palette, remembers
 * the choice in localStorage and notifies every mounted `useTheme` subscriber.
 * Until a choice is stored the console follows the operating system setting.
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
