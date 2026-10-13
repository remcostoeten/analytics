"use client";

import { noop } from "@spoar/shared/noop";
import { useSyncExternalStore } from "react";

import { sidebarAttribute, sidebarStorageKey } from "./sidebar-bootstrap";

export type SidebarState = "expanded" | "collapsed";

const listeners = new Set<() => void>();

function readSidebar(): SidebarState {
  return document.documentElement.getAttribute(sidebarAttribute) === "collapsed"
    ? "collapsed"
    : "expanded";
}

function serverSidebar(): SidebarState {
  return "expanded";
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * @name setSidebar
 * @description Collapses or expands the console sidebar, remembers the choice in
 * localStorage and notifies every mounted `useSidebar` subscriber.
 *
 * @example
 * setSidebar("collapsed");
 */
export function setSidebar(state: SidebarState) {
  if (state === "collapsed") {
    document.documentElement.setAttribute(sidebarAttribute, "collapsed");
  } else {
    document.documentElement.removeAttribute(sidebarAttribute);
  }
  try {
    localStorage.setItem(sidebarStorageKey, state);
  } catch {
    noop();
  }
  listeners.forEach((listener) => listener());
}

export function useSidebar() {
  return useSyncExternalStore(subscribe, readSidebar, serverSidebar);
}
