import type { Nullable, ProjectID } from "@spoar/shared/semantic";

import type { ConsoleHost } from "../host";
import type { ConsoleTab } from "../options";
import type { ClientAccess } from "../source";

export type ViewContext = {
  project: ProjectID;
  client: ClientAccess;
  host: Nullable<ConsoleHost>;
};

const defaultTabs: ConsoleTab[] = ["page", "events"];

export const tabLabels: { [Tab in ConsoleTab]: string } = {
  page: "This page",
  events: "My events",
  sql: "SQL",
};

/**
 * @name resolveTabs
 * @description The console tabs in their fixed order, without repeats: the caller's list, or
 * `page` and `events` when it gives none or an empty one. SQL is opt-in, as in the dashboard.
 *
 * @example
 * resolveTabs(["sql", "page"]); // ["page", "sql"]
 */
export function resolveTabs(tabs?: ConsoleTab[]): ConsoleTab[] {
  const wanted = tabs && tabs.length > 0 ? tabs : defaultTabs;
  const order: ConsoleTab[] = ["page", "events", "sql"];
  return order.filter((tab) => wanted.includes(tab));
}
