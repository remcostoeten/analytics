import { useEffect, useState } from "react";

export type Settings = {
  endpoint: string;
  project: string;
  token: string;
  publicKey: string;
};

const storageKey = "spoar-example-dashboard-settings";

const defaults: Settings = {
  endpoint: process.env.BUN_PUBLIC_DASHBOARD_API || "https://api.analytics.remcostoeten.nl",
  project: process.env.BUN_PUBLIC_DASHBOARD_PROJECT ?? "",
  token: process.env.BUN_PUBLIC_DASHBOARD_TOKEN ?? "",
  publicKey: process.env.BUN_PUBLIC_DASHBOARD_PUBLIC_KEY ?? "",
};

function field(saved: { [key: string]: unknown }, key: keyof Settings) {
  const value = saved[key];
  return typeof value === "string" && value !== "" ? value : defaults[key];
}

function stored(): Settings {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return defaults;
    const saved: { [key: string]: unknown } = JSON.parse(raw);
    return {
      endpoint: field(saved, "endpoint"),
      project: field(saved, "project"),
      token: field(saved, "token"),
      publicKey: field(saved, "publicKey"),
    };
  } catch {
    return defaults;
  }
}

/**
 * @name trimEndpoint
 * @description Strips trailing slashes so paths can be appended without doubling them.
 *
 * @example
 * trimEndpoint("https://api.example.com/"); // "https://api.example.com"
 */
export function trimEndpoint(endpoint: string) {
  return endpoint.replace(/\/+$/, "");
}

/**
 * @name useSettings
 * @description The connection settings, kept in this browser's localStorage and seeded from the
 * `BUN_PUBLIC_DASHBOARD_*` variables at build time.
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
