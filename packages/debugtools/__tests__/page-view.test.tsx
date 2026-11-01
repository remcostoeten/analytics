import { afterEach, describe, expect, test } from "bun:test";
import { createClient } from "@spoar/client";
import type { BreakdownResponse, IssueList, MetricSummary, SpeedResponse } from "@spoar/contract";
import { act } from "react";
import { createRoot } from "react-dom/client";

import { badgeBoxes, clickMarks, clickRows } from "../src/page/click-marks";
import { normalisePath, readClicks, readPage } from "../src/page/page-reads";
import { PageView } from "../src/page/page-view";
import type { ClientAccess } from "../src/source";

type Routes = { [path: string]: () => Response };

const now = new Date("2026-10-11T12:00:00.000Z");
const range = { from: "2026-10-11T11:00:00.000Z", to: "2026-10-11T12:00:00.000Z" };

function breakdown(dimension: string, data: BreakdownResponse["data"]): BreakdownResponse {
  return {
    data,
    dimension,
    total: data.length,
    nextCursor: null,
    range,
    traffic: "human",
    environment: "production",
    filters: {},
  };
}

function summary(value: number): MetricSummary {
  return {
    value,
    rating: "good",
    score: 95,
    samples: 40,
    shares: { good: 0.9, needsImprovement: 0.08, poor: 0.02 },
  };
}

const speed: SpeedResponse = {
  data: {
    score: 93,
    rating: "good",
    samples: 40,
    metrics: {
      lcp: { ...summary(2710), rating: "needs-improvement" },
      inp: summary(140),
      cls: summary(0.06),
      fcp: summary(1520),
      ttfb: summary(420),
    },
  },
  percentile: 75,
  device: "all",
  environment: "production",
  range,
  traffic: "human",
};

const issues: IssueList = {
  data: [
    {
      id: "iss_7",
      title: "TypeError: card is undefined",
      culprit: null,
      level: "error",
      status: "open",
      isRegression: false,
      count: 9,
      visitors: 3,
      firstSeen: "2026-10-10T08:00:00.000Z",
      lastSeen: "2026-10-11T11:30:00.000Z",
      firstRelease: null,
      lastRelease: null,
      resolvedAt: null,
    },
  ],
  nextCursor: null,
};

const defaults: Routes = {
  "/v2/projects/site/breakdown/page": () =>
    Response.json(
      breakdown("page", [
        { value: "/cars", visitors: 1204, pageviews: 1810, bounceRate: 0.412, avgTimeMs: 72_000 },
      ]),
    ),
  "/v2/projects/site/breakdown/referrer_domain": () =>
    Response.json(
      breakdown("referrer_domain", [
        { value: "google.com", visitors: 300 },
        { value: "", visitors: 120 },
      ]),
    ),
  "/v2/projects/site/speed": () => Response.json(speed),
  "/v2/projects/site/breakdown/issue": () =>
    Response.json(breakdown("issue", [{ value: "iss_7", events: 4 }])),
  "/v2/projects/site/issues": () => Response.json(issues),
  "/v2/projects/site/breakdown/prop%3Alabel": () =>
    Response.json(
      breakdown("prop:label", [
        { value: "signup", events: 3 },
        { value: "upgrade", events: 12 },
        { value: "", events: 1 },
      ]),
    ),
};

function fakeAccess(seen: URL[], routes: Routes = {}): ClientAccess {
  const table = { ...defaults, ...routes };
  const client = createClient({
    endpoint: "https://api.example.com",
    token: "wt_test",
    fetch: async (input, init) => {
      const url = new URL(new Request(input, init).url);
      seen.push(url);
      const route = table[url.pathname];
      return route
        ? route()
        : Response.json({ code: "NOT_FOUND", message: "none" }, { status: 404 });
    },
  });
  return async () => client;
}

function forbidden() {
  return Response.json({ code: "FORBIDDEN", message: "Not allowed" }, { status: 403 });
}

const cleanups: (() => void)[] = [];

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

async function render(access: ClientAccess) {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () =>
    root.render(<PageView context={{ project: "site", client: access, host: null }} />),
  );
  await settle();
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return container;
}

describe("readPage", () => {
  test("reads the path's stats, referrers, vitals and issues over the range", async () => {
    const seen: URL[] = [];
    const report = await readPage(fakeAccess(seen), "site", "/cars", "1h", now);
    expect(report.stats).toEqual({
      ok: true,
      value: { visitors: 1204, pageviews: 1810, bounceRate: 0.412, timeOnPageMs: 72_000 },
    });
    expect(report.referrers.ok && report.referrers.value).toEqual([
      { referrer: "google.com", visitors: 300 },
      { referrer: "", visitors: 120 },
    ]);
    expect(report.vitals.ok && report.vitals.value.metrics[0]).toEqual({
      name: "lcp",
      value: 2710,
      rating: "needs-improvement",
    });
    expect(report.issues).toEqual({
      ok: true,
      value: [{ id: "iss_7", title: "TypeError: card is undefined", count: 4 }],
    });
    const reads = seen.filter((url) => url.pathname !== "/v2/projects/site/issues");
    for (const url of reads) {
      expect(url.searchParams.get("filter[page]")).toBe("/cars");
      expect(url.searchParams.get("from")).toBe(range.from);
      expect(url.searchParams.get("to")).toBe(range.to);
    }
    expect(seen.find((url) => url.pathname.endsWith("/speed"))?.searchParams.get("device")).toBe(
      "all",
    );
  });

  test("keeps the other parts when one read is forbidden", async () => {
    const report = await readPage(
      fakeAccess([], { "/v2/projects/site/speed": forbidden }),
      "site",
      "/cars",
      "24h",
      now,
    );
    expect(report.vitals).toEqual({ ok: false, error: "This console may not read this." });
    expect(report.stats.ok).toBe(true);
  });
});

describe("readClicks", () => {
  test("counts click events per label on the path, most clicked first", async () => {
    const seen: URL[] = [];
    const clicks = await readClicks(fakeAccess(seen), "site", "/cars", "7d", now);
    expect(clicks).toEqual({
      ok: true,
      value: [
        { label: "upgrade", count: 12 },
        { label: "signup", count: 3 },
      ],
    });
    expect(seen[0]?.searchParams.get("filter[event]")).toBe("click");
    expect(seen[0]?.searchParams.get("filter[page]")).toBe("/cars");
    expect(seen[0]?.searchParams.get("metrics")).toBe("events");
  });
});

describe("click marks", () => {
  test("finds marked elements by either attribute", () => {
    const root = document.createElement("div");
    root.innerHTML =
      '<button data-spoar-click="upgrade"></button><a data-ra-click="docs"></a><p></p>';
    expect(clickMarks(root).map((mark) => mark.label)).toEqual(["upgrade", "docs"]);
  });

  test("flags counted labels missing from the page and adds unclicked ones", () => {
    expect(
      clickRows(
        [
          { label: "upgrade", count: 4 },
          { label: "old-cta", count: 2 },
        ],
        ["upgrade", "signup"],
      ),
    ).toEqual([
      { label: "upgrade", count: 4, onPage: true },
      { label: "old-cta", count: 2, onPage: false },
      { label: "signup", count: 0, onPage: true },
    ]);
  });

  test("leaves out hidden and off-screen elements", () => {
    const shown = document.createElement("button");
    const hidden = document.createElement("button");
    const below = document.createElement("button");
    shown.getBoundingClientRect = () => new DOMRect(10, 20, 100, 30);
    below.getBoundingClientRect = () => new DOMRect(10, 900, 100, 30);
    const boxes = badgeBoxes(
      [
        { element: shown, label: "upgrade" },
        { element: hidden, label: "signup" },
        { element: below, label: "footer" },
      ],
      new Map([["upgrade", 4]]),
      { width: 1280, height: 720 },
    );
    expect(boxes).toEqual([
      { label: "upgrade", count: 4, top: 20, left: 10, width: 100, height: 30 },
    ]);
  });

  test("normalises typed paths", () => {
    expect(normalisePath(" pricing?plan=pro ")).toBe("/pricing");
    expect(normalisePath("")).toBe("/");
    expect(normalisePath("/blog#top")).toBe("/blog");
  });
});

describe("PageView", () => {
  test("shows the host page's numbers and follows SPA navigation", async () => {
    const seen: URL[] = [];
    const container = await render(fakeAccess(seen));
    const input = container.querySelector<HTMLInputElement>('[aria-label="Page path"]');
    expect(input?.value).toBe(window.location.pathname);
    expect(container.textContent).toContain("1,204");
    expect(container.textContent).toContain("41%");
    expect(container.textContent).toContain("1m 12s");
    expect(container.textContent).toContain("google.com");
    expect(container.textContent).toContain("Direct");
    expect(container.textContent).toContain("2.71 s");
    expect(container.textContent).toContain("TypeError: card is undefined");

    const start = window.location.pathname;
    window.history.pushState(null, "", "/trucks");
    await act(async () => window.dispatchEvent(new PopStateEvent("popstate")));
    await settle();
    expect(input?.value).toBe("/trucks");
    const pageReads = seen.filter((url) => url.pathname.endsWith("/breakdown/page"));
    expect(pageReads.at(-1)?.searchParams.get("filter[page]")).toBe("/trucks");
    window.history.pushState(null, "", start);
  });

  test("shows a plain message when a read is forbidden", async () => {
    const container = await render(fakeAccess([], { "/v2/projects/site/speed": forbidden }));
    const alerts = Array.from(
      container.querySelectorAll("[role=alert]"),
      (node) => node.textContent,
    );
    expect(alerts).toEqual(["This console may not read this."]);
  });

  test("outlines marked elements with their click counts", async () => {
    const button = document.createElement("button");
    button.dataset.spoarClick = "upgrade";
    button.getBoundingClientRect = () => new DOMRect(40, 60, 120, 32);
    document.body.append(button);
    cleanups.push(() => button.remove());
    const container = await render(fakeAccess([]));
    await act(async () =>
      Array.from(container.querySelectorAll("button"))
        .find((node) => node.textContent === "Show clicks")
        ?.click(),
    );
    await settle();
    await settle();
    const badge = document.querySelector<HTMLElement>('[data-click-label="upgrade"]');
    expect(badge?.textContent).toBe("12");
    expect(badge?.style.top).toBe("60px");
    expect(container.textContent).toContain("signupnot on this page");
  });

  test("points to data-spoar-click when the page has no marked elements", async () => {
    const container = await render(fakeAccess([]));
    await act(async () =>
      Array.from(container.querySelectorAll("button"))
        .find((node) => node.textContent === "Show clicks")
        ?.click(),
    );
    await settle();
    expect(container.textContent).toContain("This page has no marked elements");
    expect(container.textContent).toContain('data-spoar-click="name"');
    expect(document.querySelector("[data-click-label]")).toBeNull();
  });
});
