import type { NoProps } from "@spoar/sdk";

export type Events = {
  period_changed: { period: string };
  traffic_changed: { traffic: string };
  filter_added: { dimension: string };
  filter_removed: { dimension: string };
  settings_saved: NoProps;
};
