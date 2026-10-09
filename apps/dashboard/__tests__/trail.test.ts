import { describe, expect, test } from "bun:test";
import type { SessionEvent } from "@spoar/contract";

import { countSteps, formatProps, trailSteps } from "../src/modules/analytics/trail";

function event(id: string, name: string, ts: string, path: string, props = {}): SessionEvent {
  return { id, name, ts, page: { path, route: null, title: null, referrer: null }, props };
}

const events = [
  event("3", "pageview", "2026-09-27T16:39:02.000Z", "/projects"),
  event("1", "pageview", "2026-09-27T16:38:10.000Z", "/"),
  event("2", "click", "2026-09-27T16:39:01.200Z", "/", { element: "nav-projects" }),
  event("v", "web_vital", "2026-09-27T16:38:11.000Z", "/", { metric: "lcp" }),
  event("4", "signup", "2026-09-27T16:39:59.901Z", "/projects", { plan: "pro" }),
];

describe("trailSteps", () => {
  test("orders events, offsets them from the first and measures time on page", () => {
    const steps = trailSteps(events);
    expect(steps.map((step) => step.id)).toEqual(["1", "2", "3", "4"]);
    expect(steps.map((step) => step.kind)).toEqual(["pageview", "event", "pageview", "event"]);
    expect(steps.map((step) => step.offsetMs)).toEqual([0, 51_200, 52_000, 109_901]);
    expect(steps[0]?.dwellMs).toBe(52_000);
    expect(steps[2]?.dwellMs).toBeNull();
    expect(steps[1]?.dwellMs).toBeNull();
  });

  test("counts pageviews and events and formats props", () => {
    expect(countSteps(trailSteps(events))).toEqual({ pageviews: 2, events: 2 });
    expect(formatProps({ plan: "pro", seats: 3, empty: "", gone: null })).toEqual([
      "plan: pro",
      "seats: 3",
    ]);
    expect(trailSteps([])).toEqual([]);
  });
});
