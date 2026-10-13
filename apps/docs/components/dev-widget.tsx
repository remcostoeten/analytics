"use client";

import { noop } from "@spoar/shared/noop";
import { useEffect, useSyncExternalStore } from "react";

import { apiEndpoint } from "@/lib/api-endpoint";
import { siteProject } from "@/lib/site-project";

const storageKey = "spoar:dev-widget";
const listeners = new Set<() => void>();
let enabled = false;
let openOnMount = false;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot() {
  return enabled;
}

function serverSnapshot() {
  return false;
}

function stored() {
  try {
    return localStorage.getItem(storageKey) === "on";
  } catch {
    return false;
  }
}

function remember(next: boolean) {
  try {
    if (next) localStorage.setItem(storageKey, "on");
    else localStorage.removeItem(storageKey);
  } catch {
    return;
  }
}

function setWidget(next: boolean, open: boolean) {
  enabled = next;
  openOnMount = open;
  remember(next);
  for (const listener of listeners) listener();
}

function isShortcut(event: KeyboardEvent) {
  return (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "k";
}

/**
 * @name DevWidgetHost
 * @description Mounts `@spoar/debugtools` on this site while the dev widget is switched on, and
 * downloads nothing while it is off. Ctrl+Shift+K switches it on and opens it. An owner or admin
 * of the site's project gets live data; everyone else gets the fixture console.
 *
 * @example
 * <DevWidgetHost />
 */
export function DevWidgetHost() {
  const on = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  useEffect(() => {
    if (stored()) setWidget(true, false);
  }, []);

  useEffect(() => {
    if (on) return;
    function onKey(event: KeyboardEvent) {
      if (!isShortcut(event)) return;
      event.preventDefault();
      setWidget(true, true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [on]);

  useEffect(() => {
    if (!on) return;
    let cancelled = false;
    let unmount = noop;
    void import("@spoar/debugtools").then(({ mount }) => {
      if (cancelled) return;
      unmount = mount({
        endpoint: apiEndpoint(),
        project: siteProject(),
        demo: true,
        open: openOnMount,
      });
    });
    return () => {
      cancelled = true;
      unmount();
    };
  }, [on]);

  return null;
}

/**
 * @name DevWidgetToggle
 * @description A button that switches the dev widget on this site on or off. The choice is kept
 * per browser.
 *
 * @example
 * <DevWidgetToggle />
 */
export function DevWidgetToggle() {
  const on = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return (
    <span className="not-prose my-6 flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setWidget(!on, !on)}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-fd-border bg-fd-card px-3 text-sm font-medium text-fd-foreground transition-colors hover:border-fd-muted-foreground"
      >
        <span
          aria-hidden="true"
          className={`size-1.5 rounded-full ${on ? "bg-fd-foreground" : "bg-fd-muted-foreground"}`}
        />
        {on ? "Hide the dev widget" : "Show the dev widget"}
      </button>
      <span className="text-xs text-fd-muted-foreground">
        Or press <kbd>Ctrl</kbd> <kbd>Shift</kbd> <kbd>K</kbd>
      </span>
    </span>
  );
}
