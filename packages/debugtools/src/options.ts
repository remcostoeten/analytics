import type { Fetcher } from "@spoar/shared/http";
import type { ProjectID, Timestamp } from "@spoar/shared/semantic";

import type { ConsoleHost } from "./host";
import type { ConsoleSections } from "./sections";
import type { ConsoleData, ConsoleTheme } from "./types";

export type ConsoleAuth = "widget" | "session";

export type LauncherSide = "left" | "right";

export type ConsoleTab = "page" | "events" | "sql";

export type WidgetGrant = {
  token: string;
  expiresAt: Timestamp;
};

export type DebugtoolsOptions = {
  endpoint: string;
  project: ProjectID;
  auth?: ConsoleAuth;
  launcher?: LauncherSide;
  fetch?: Fetcher;
  data?: ConsoleData;
  sections?: ConsoleSections;
  theme?: ConsoleTheme;
  demo?: boolean;
  open?: boolean;
  tabs?: ConsoleTab[];
  host?: ConsoleHost;
};
