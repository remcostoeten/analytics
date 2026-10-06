import { useEffect, useState } from "react";
import { isRecord, parseJson, text } from "./json";
import type { Settings } from "./request";

const storageKey = "spoar-playground-settings";

const defaultSettings: Settings = {
  base: "https://api.analytics.remcostoeten.nl",
  token: "",
  projectKey: "",
  project: "",
};

function stored(): Settings {
  try {
    const saved = parseJson(localStorage.getItem(storageKey) ?? "");
    if (!isRecord(saved)) return defaultSettings;
    return {
      base: text(saved.base, defaultSettings.base),
      token: text(saved.token),
      projectKey: text(saved.projectKey),
      project: text(saved.project),
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
