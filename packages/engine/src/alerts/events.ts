import type { AlertEvent, AlertEventName, IssueAlert } from "@remcostoeten/analytics-contract";

export type AlertEvents = {
  "issue.new": IssueAlert;
  "issue.regression": IssueAlert;
};

export type AlertOf<Name extends AlertEventName> = AlertEvents[Name] & { name: Name };

export const alertEventNames = [
  "issue.new",
  "issue.regression",
] as const satisfies readonly AlertEventName[];

export const alertLabels: { [Name in AlertEventName]: { one: string; many: string; tag: string } } =
  {
    "issue.new": { one: "new issue", many: "new issues", tag: "NEW" },
    "issue.regression": { one: "regression", many: "regressions", tag: "REGRESSION" },
  };

/**
 * @name newestFirst
 * @description Alert events ordered by when they last happened, newest first.
 *
 * @example
 * newestFirst(batch.deliveries.map((delivery) => delivery.event));
 */
export function newestFirst(events: AlertEvent[]): AlertEvent[] {
  return [...events].sort((a, b) => b.issue.lastSeen.localeCompare(a.issue.lastSeen));
}
