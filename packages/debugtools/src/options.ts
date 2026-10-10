import type { Fetcher } from "@spoar/shared/http";
import type { ProjectID } from "@spoar/shared/semantic";

import type { ConsoleData } from "./types";

export type DebugtoolsOptions = {
  endpoint: string;
  project: ProjectID;
  fetch?: Fetcher;
  data?: ConsoleData;
};
