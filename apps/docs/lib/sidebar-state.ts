import { useSyncExternalStore } from "react";

let openSection: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot() {
  return openSection;
}

export function useOpenSection() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

export function setOpenSection(id: string | null) {
  openSection = id;
  emit();
}

export function toggleSection(id: string) {
  setOpenSection(openSection === id ? null : id);
}
