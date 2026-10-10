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
