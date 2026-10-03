import type { Fetcher } from "@remcostoeten/analytics-shared/http";
import type { ProjectID } from "@remcostoeten/analytics-shared/semantic";
import type { Analytics } from "@spoar/sdk";

export type DevtoolsOptions = {
  endpoint: string;
  project: ProjectID;
  analytics?: Pick<Analytics, "on">;
  fetch?: Fetcher;
  catalogUrl?: string;
  dashboardUrl?: string;
};
