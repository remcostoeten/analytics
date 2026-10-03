import type { Issue, IssueEvent } from "../../../client/types";
import type { Fields } from "../../../filter/parse";

export const issueFields: Fields<Issue> = {
  level: (row) => row.level,
  status: (row) => row.status,
  release: (row) => row.lastRelease,
  count: (row) => row.count,
  users: (row) => row.visitors,
  path: (row) => row.culprit,
  at: (row) => row.culprit,
};

export function issueText(row: Issue) {
  return [row.title, row.culprit, row.lastRelease].filter(Boolean).join(" ");
}

export function stackText(event: IssueEvent) {
  const frames = event.error.stack.map((frame) => {
    const place = [frame.file, frame.line, frame.column].filter((part) => part !== null).join(":");
    return frame.function ? `    at ${frame.function} (${place})` : `    at ${place}`;
  });
  return [`${event.error.type}: ${event.error.message}`, ...frames].join("\n");
}

export function browserCounts(events: IssueEvent[]) {
  const counts = new Map<string, number>();
  for (const event of events) {
    const name = event.device.browser ?? "unknown";
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([name, total]) => `${name} (${total})`)
    .join(", ");
}

export const issueColumns = "92px 72px minmax(0,1.4fr) minmax(0,1fr) 56px 56px 110px 16px";

export const issueHeader = ["last", "level", "message", "at", "count", "users", "release", ""];
