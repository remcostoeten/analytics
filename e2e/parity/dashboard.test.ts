import { beforeAll, describe, expect, test } from "bun:test";

import type { Client } from "@spoar/client";

import { placeAnnotations } from "../../apps/dashboard/src/modules/analytics/annotations";
import { nextStatuses, splitTitle } from "../../apps/dashboard/src/modules/analytics/issues";
import { mergeEvents, needsSignIn } from "../../apps/dashboard/src/modules/analytics/realtime";
import {
  rateVital,
  speedDevice,
  speedFilters,
  speedInterval,
  vitalView,
} from "../../apps/dashboard/src/modules/analytics/speed";
import {
  collectTrail,
  countSteps,
  trailMaxPages,
  trailPageSize,
  trailSteps,
} from "../../apps/dashboard/src/modules/analytics/trail";
import { readViewState } from "../../apps/dashboard/src/modules/analytics/view-state";
import { day, project, sessions, startParityApi, visitors } from "./seed";

let client: Client<string>;
let anonymous: Client<string>;

function unwrap<Value>(
  result: { ok: true; value: Value } | { ok: false; error: { message: string } },
) {
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

beforeAll(async () => {
  const started = await startParityApi();
  client = started.client;
  anonymous = started.anonymous;
}, 60_000);

describe("web analytics", () => {
  const state = readViewState({});

  test("the metric rail reads the fixed totals", async () => {
    const scope = client.project(project).period(state.period).traffic("human");
    const stats = unwrap(await scope.stats()).data;
    expect(stats.visitors.value).toBe(3);
    expect(stats.pageviews.value).toBe(6);
    expect(stats.sessions.value).toBe(4);
    expect(stats.bounceRate.value).toBe(0.5);
  });

  test("the summary series has one bucket per day", async () => {
    const series = unwrap(await client.project(project).period("7d").timeseries("visitors"));
    expect(series.interval).toBe("day");
    expect(series.data.map((point) => point.value)).toEqual([0, 0, 0, 0, 1, 1, 2]);
  });

  test("the top list of paths ranks by visitors", async () => {
    const paths = unwrap(
      await client
        .project(project)
        .period("7d")
        .breakdown("page", { metrics: ["visitors"], limit: 5 }),
    );
    expect(paths.data.map((row) => [row.value, row.visitors])).toEqual([
      ["/", 3],
      ["/blog/post", 1],
      ["/docs", 1],
      ["/pricing", 1],
    ]);
  });
});

describe("speed", () => {
  const state = readViewState({ route: "/", browser: "Firefox" });

  test("the vitals rail reads the percentile, rating and shares", async () => {
    const speed = unwrap(
      await client
        .project(project)
        .period("7d")
        .speed({ percentile: state.percentile, device: speedDevice(state.filters) }),
    ).data;
    expect(speed.metrics.lcp).toMatchObject({
      value: 4500,
      rating: "poor",
      samples: 55,
      shares: { good: 0.55, needsImprovement: 0, poor: 0.45 },
    });
    expect(speed.metrics.inp).toMatchObject({ value: 150, rating: "good", samples: 25 });
    expect(speed.metrics.cls).toMatchObject({ value: 0.05, rating: "good" });
    expect(speed.metrics.ttfb).toMatchObject({ value: 600, rating: "good" });
    expect(rateVital(vitalView("lcp"), speed.metrics.lcp.value ?? 0)).toBe("poor");
  });

  test("the series buckets the samples by day with gaps", async () => {
    const series = unwrap(
      await client
        .project(project)
        .period("7d")
        .speedTimeseries({ metric: "lcp", percentile: 75, interval: speedInterval("7d") }),
    );
    expect(series.data.map((point) => point.value)).toEqual([
      null,
      null,
      null,
      null,
      2000,
      4500,
      null,
    ]);
    expect(series.data.map((point) => point.samples)).toEqual([0, 0, 0, 0, 30, 25, 0]);
  });

  test("routes and elements filter on the route only", async () => {
    const scope = client.project(project).period("7d");
    const routes = unwrap(await scope.speedRoutes({ percentile: 75 }));
    expect(routes.data.map((row) => [row.route, row.lcp, row.inp])).toEqual([
      ["/docs", 4500, null],
      ["/", 2000, 150],
    ]);
    const filtered = unwrap(
      await scope.where(speedFilters(state.filters)).speedRoutes({ percentile: 75 }),
    );
    expect(filtered.data.map((row) => row.route)).toEqual(["/"]);
    const elements = unwrap(await scope.speedElements({ metric: "lcp", percentile: 75 }));
    expect(elements.data).toEqual([
      { selector: "img.hero", route: "/docs", samples: 25, value: 4500 },
    ]);
  });

  test("speed stays readable signed out", async () => {
    const speed = await anonymous.project(project).period("7d").speed();
    expect(speed.ok).toBe(true);
  });
});

describe("issues", () => {
  test("the list groups errors with counts and affected users", async () => {
    const issues = unwrap(await client.project(project).issues({ status: "open" }));
    const rows = issues.data.map((issue) => [
      splitTitle(issue.title).type,
      issue.count,
      issue.visitors,
    ]);
    expect(rows).toEqual([
      ["RangeError", 1, 1],
      ["TypeError", 3, 2],
    ]);
    expect(issues.data[1]?.culprit).toContain("PostCard");
  });

  test("the detail has its events and stack, and the status round-trips", async () => {
    const scope = client.project(project);
    const [issue] = unwrap(await scope.issues({ status: "open" })).data.filter((entry) =>
      entry.title.startsWith("TypeError"),
    );
    if (!issue) throw new Error("no TypeError issue");
    const events = unwrap(await scope.issueEvents(issue.id));
    expect(events.data).toHaveLength(3);
    expect(events.data[0]?.error.stack[0]).toMatchObject({ function: "PostCard", inApp: true });
    expect(nextStatuses(issue.status).map((action) => action.status)).toEqual([
      "resolved",
      "ignored",
    ]);
    const resolved = unwrap(await scope.updateIssue(issue.id, { status: "resolved" }));
    expect(resolved.data.status).toBe("resolved");
    expect(unwrap(await scope.issues({ status: "open" })).data).toHaveLength(1);
    unwrap(await scope.updateIssue(issue.id, { status: "open" }));
  });

  test("issues need sign-in", async () => {
    const refused = await anonymous.project(project).issues();
    expect(needsSignIn(refused)).toBe(true);
  });
});

describe("realtime", () => {
  test("counts the live visitor and lists their event, visitor row and session trail", async () => {
    const scope = client.project(project);
    const summary = unwrap(await scope.realtime()).data;
    expect(summary.visitors).toBe(1);
    expect(summary.pages).toEqual([{ value: "/live", visitors: 1 }]);
    const events = unwrap(await scope.realtimeEvents({ limit: 50 }));
    const merged = mergeEvents([], events.data, 100);
    expect(merged[0]).toMatchObject({ name: "pageview", path: "/live", visitor: visitors.d });
    expect(merged).toHaveLength(50);
    expect(mergeEvents(merged, events.data, 100)).toBe(merged);
    const live = unwrap(await scope.realtimeVisitors());
    expect(live.data.find((row) => row.visitor === visitors.d)).toMatchObject({
      path: "/live",
      pages: 1,
    });
    const liveSessions = unwrap(await scope.realtimeSessions());
    expect(liveSessions.data.find((row) => row.visitor === visitors.d)?.trail).toEqual(["/live"]);
  });

  test("active visitors need sign-in while the summary does not", async () => {
    const scope = anonymous.project(project);
    expect((await scope.realtime()).ok).toBe(true);
    expect(needsSignIn(await scope.realtimeVisitors())).toBe(true);
  });
});

describe("visitors and trails", () => {
  test("the list holds the three visitors in range", async () => {
    const list = unwrap(await client.project(project).period("7d").visitors());
    const rows = list.data.map((row) => [row.id, row.sessions, row.pageviews]);
    rows.sort((left, right) => String(left[0]).localeCompare(String(right[0])));
    expect(rows).toEqual([
      [visitors.a, 2, 3],
      [visitors.b, 1, 2],
      [visitors.c, 1, 1],
    ]);
  });

  test("the visitor page reads the facts and visits", async () => {
    const scope = client.project(project);
    const detail = unwrap(await scope.visitor(visitors.a)).data;
    expect(detail).toMatchObject({
      sessions: 2,
      pageviews: 3,
      events: 133,
      visitCount: 2,
      daysActive: 2,
    });
    expect(detail.recentSessions.map((session) => session.durationMs)).toEqual([10_000, 40_000]);
    const visits = unwrap(await scope.visitorVisits(visitors.a)).data;
    expect(
      visits.map((visit) => [visit.visitNumber, visit.pages.map((page) => page.path)]),
    ).toEqual([
      [1, ["/", "/pricing"]],
      [2, ["/blog/post"]],
    ]);
    expect(visits[1]?.sincePreviousVisitMs).toBe(169_200_000);
    expect(visits[0]?.actions.map((action) => action.name)).toEqual(["click", "error"]);
  });

  test("the session trail is an ordered timeline of pageviews and events", async () => {
    const scope = client.project(project);
    const trail = unwrap(
      await collectTrail(
        (cursor) => scope.sessionEvents(sessions.a1, { limit: trailPageSize, cursor }),
        trailMaxPages,
      ),
    );
    expect(trail.data).toHaveLength(134);
    const steps = trailSteps(trail.data);
    expect(steps.map((step) => [step.kind, step.path, step.offsetMs, step.dwellMs])).toEqual([
      ["pageview", "/", 0, 40_000],
      ["event", "/", 30_000, null],
      ["event", "/", 35_000, null],
      ["pageview", "/pricing", 40_000, null],
    ]);
    expect(steps.map((step) => step.name)).toEqual(["pageview", "click", "error", "pageview"]);
    expect(countSteps(steps)).toEqual({ pageviews: 2, events: 2 });
    expect(trail.session.durationMs).toBe(40_000);
  });

  test("visitors need sign-in", async () => {
    expect(needsSignIn(await anonymous.project(project).period("7d").visitors())).toBe(true);
  });
});

describe("annotations", () => {
  test("admin annotations land on the summary chart's buckets", async () => {
    unwrap(
      await client.annotations.create(project, {
        title: "v2.0 released",
        date: day(2),
        kind: "release",
      }),
    );
    const incident = unwrap(
      await client.annotations.create(project, {
        title: "CDN outage",
        date: day(4),
        endDate: day(3),
        kind: "incident",
      }),
    );
    const scope = client.project(project).period("7d");
    const [series, annotations] = await Promise.all([
      scope.timeseries("visitors"),
      scope.annotations(),
    ]);
    const placed = placeAnnotations(
      unwrap(annotations).data,
      unwrap(series).data.map((point) => point.bucket),
    );
    expect(placed.map((entry) => [entry.annotation.title, entry.index, entry.endIndex])).toEqual([
      ["CDN outage", 3, 4],
      ["v2.0 released", 5, null],
    ]);
    unwrap(await client.annotations.remove(project, incident.id));
    expect(unwrap(await scope.annotations()).data.map((entry) => entry.title)).toEqual([
      "v2.0 released",
    ]);
  });
});
