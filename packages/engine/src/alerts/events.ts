import type {
  AlertEvent,
  AlertEventName,
  IssueAlert,
  SpeedAlert,
} from "@remcostoeten/analytics-contract";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

export type AlertEvents = {
  "issue.new": IssueAlert;
  "issue.regression": IssueAlert;
  "speed.drop": SpeedAlert;
};

export type AlertOf<Name extends AlertEventName> = AlertEvents[Name] & { name: Name };

export const alertEventNames = [
  "issue.new",
  "issue.regression",
  "speed.drop",
] as const satisfies readonly AlertEventName[];

/**
 * @name defaultAlertEvents
 * @description The events a target subscribes to when it names none: every issue event. Speed
 * drops are opt-in.
 *
 * @example
 * const on = input.on ?? [...defaultAlertEvents];
 */
export const defaultAlertEvents = [
  "issue.new",
  "issue.regression",
] as const satisfies readonly AlertEventName[];

export const alertLabels: { [Name in AlertEventName]: { one: string; many: string; tag: string } } =
  {
    "issue.new": { one: "new issue", many: "new issues", tag: "NEW" },
    "issue.regression": { one: "regression", many: "regressions", tag: "REGRESSION" },
    "speed.drop": { one: "speed drop", many: "speed drops", tag: "SLOWER" },
  };

const metricNames = { lcp: "LCP", inp: "INP", cls: "CLS", fcp: "FCP", ttfb: "TTFB" };

function times(count: number) {
  return count === 1 ? "once" : `${count} times`;
}

/**
 * @name alertTime
 * @description When an alert event happened: the issue's last sighting, or the end of the window
 * a speed drop was measured over.
 *
 * @example
 * alertTime(event); // "2026-09-30T00:00:00.000Z"
 */
export function alertTime(event: AlertEvent): string {
  return event.name === "speed.drop" ? event.speed.to : event.issue.lastSeen;
}

/**
 * @name alertTitle
 * @description The headline of an alert event: the issue title, or the project's Real Experience
 * Score before and after a speed drop.
 *
 * @example
 * alertTitle(event); // "Real Experience Score 92 to 74"
 */
export function alertTitle(event: AlertEvent): string {
  if (event.name === "speed.drop") {
    return `Real Experience Score ${event.speed.previous} to ${event.speed.score}`;
  }
  return event.issue.title;
}

/**
 * @name alertUrl
 * @description Where an alert event links to: the issue, or the project's speed read.
 *
 * @example
 * alertUrl(event); // "https://api.analytics.remcostoeten.nl/v2/projects/remcostoeten.nl/speed"
 */
export function alertUrl(event: AlertEvent): string {
  return event.name === "speed.drop" ? event.speed.url : event.issue.url;
}

/**
 * @name alertDetail
 * @description The second line of an alert event: for an issue its culprit, count and release,
 * for a speed drop the rating, the metric that fell most and the sample count.
 *
 * @example
 * alertDetail(event); // "needs improvement · LCP fell most · 1,240 samples"
 */
export function alertDetail(event: AlertEvent): string {
  if (event.name === "speed.drop") {
    const { rating, worst, samples } = event.speed;
    const parts: Nullable<string>[] = [
      rating.replace("-", " "),
      worst ? `${metricNames[worst]} fell most` : null,
      `${samples.toLocaleString("en-US")} samples`,
    ];
    return parts.filter((part) => part !== null).join(" · ");
  }
  const release = event.issue.lastRelease;
  const parts = [event.issue.culprit, times(event.issue.count)];
  if (event.name === "issue.regression") {
    parts.push(release ? `resolved, seen again in ${release}` : "resolved, seen again");
  } else if (release) {
    parts.push(`release ${release}`);
  }
  return parts.filter((part) => part !== null).join(" · ");
}

/**
 * @name newestFirst
 * @description Alert events ordered by when they happened, newest first.
 *
 * @example
 * newestFirst(batch.deliveries.map((delivery) => delivery.event));
 */
export function newestFirst(events: AlertEvent[]): AlertEvent[] {
  return [...events].sort((a, b) => alertTime(b).localeCompare(alertTime(a)));
}
