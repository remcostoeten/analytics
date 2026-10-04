import type { Fetcher } from "@spoar/shared/http";
import type { ProjectID } from "@spoar/shared/semantic";
import type { Analytics } from "@spoar/sdk";

export type DevtoolsOptions = {
  endpoint: string;
  project: ProjectID;
  analytics?: Pick<Analytics, "on">;
  fetch?: Fetcher;
  catalogUrl?: string;
  dashboardUrl?: string;
};
