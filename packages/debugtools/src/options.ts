import type { Fetcher } from "@spoar/shared/http";
import type { ProjectID } from "@spoar/shared/semantic";

import type { ConsoleSections } from "./sections";
import type { ConsoleData, ConsoleTheme } from "./types";

export type DebugtoolsOptions = {
  endpoint: string;
  project: ProjectID;
  fetch?: Fetcher;
  data?: ConsoleData;
  sections?: ConsoleSections;
  theme?: ConsoleTheme;
};
