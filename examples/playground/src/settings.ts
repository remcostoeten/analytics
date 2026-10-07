import { useEffect, useState } from "react";
import { isRecord, parseJson, text } from "./json";
import type { Settings } from "./request";

const storageKey = "spoar-playground-settings";

const defaultSettings: Settings = {
  base: process.env.BUN_PUBLIC_PLAYGROUND_API || "https://api.analytics.remcostoeten.nl",
  token: process.env.BUN_PUBLIC_PLAYGROUND_TOKEN ?? "",
  projectKey: process.env.BUN_PUBLIC_PLAYGROUND_PROJECT_KEY ?? "",
  project: process.env.BUN_PUBLIC_PLAYGROUND_PROJECT ?? "",
};

function stored(): Settings {
  try {
    const saved = parseJson(localStorage.getItem(storageKey) ?? "");
    if (!isRecord(saved)) return defaultSettings;
    return {
      base: text(saved.base, defaultSettings.base),
      token: text(saved.token) || defaultSettings.token,
      projectKey: text(saved.projectKey) || defaultSettings.projectKey,
      project: text(saved.project) || defaultSettings.project,
    };
  } catch {
    return defaultSettings;
  }
}

/**
 * @name useSettings
 * @description The playground's connection settings, kept in this browser's localStorage.
 *
 * @example
 * const [settings, setSettings] = useSettings();
 */
export function useSettings() {
  const [settings, setSettings] = useState(stored);
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(settings));
    } catch (error) {
      console.warn("Settings were not saved", error);
    }
  }, [settings]);
  return [settings, setSettings] as const;
}
