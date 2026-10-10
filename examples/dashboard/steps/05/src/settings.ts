export type Settings = {
  endpoint: string;
  project: string;
  token: string;
  publicKey: string;
};

export const settings: Settings = {
  endpoint: process.env.BUN_PUBLIC_DASHBOARD_API || "https://api.analytics.remcostoeten.nl",
  project: process.env.BUN_PUBLIC_DASHBOARD_PROJECT ?? "",
  token: process.env.BUN_PUBLIC_DASHBOARD_TOKEN ?? "",
  publicKey: process.env.BUN_PUBLIC_DASHBOARD_PUBLIC_KEY ?? "",
};

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
