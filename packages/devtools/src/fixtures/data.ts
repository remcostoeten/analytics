import type { ActiveVisitor, LiveSession, LogLine, Overview, WidgetSession } from "@spoar/contract";

import type { VisitorBot } from "../client/adapt";
import type { Issue, IssueEvent, SpeedRoute } from "../client/types";

export type Fixtures = {
  session: WidgetSession;
  visitors: ActiveVisitor[];
  details: VisitorBot[];
  sessions: LiveSession[];
  logs: LogLine[];
  overview: Overview;
  speed: SpeedRoute[];
  issues: Issue[];
  issueEvents: { [issue: string]: IssueEvent[] };
};

function ago(now: number, seconds: number) {
  return new Date(now - seconds * 1000).toISOString();
}

function visitor(
  now: number,
  seconds: number,
  partial: Omit<ActiveVisitor, "lastSeen" | "identified"> &
    Partial<Pick<ActiveVisitor, "identified">>,
): ActiveVisitor {
  return { identified: false, ...partial, lastSeen: ago(now, seconds) };
}

function visitors(now: number): ActiveVisitor[] {
  return [
    visitor(now, 4, {
      visitor: "v_8f2a1c3e9c1e",
      session: "s_2b7f40a1e",
      path: "/cars/polestar-2",
      referrer: "google",
      country: "NL",
      city: "Amsterdam",
      device: "desktop",
      browser: "Safari 26",
      os: "macOS",
      botScore: 4,
      pages: 3,
      duration: 242,
    }),
    visitor(now, 8, {
      visitor: "v_19d0aa507e40",
      session: "s_90aa21dc4",
      path: "/private-lease",
      referrer: null,
      country: "BE",
      city: "Antwerp",
      device: "mobile",
      browser: "Safari",
      os: "iOS 26",
      botScore: 2,
      pages: 1,
      duration: 42,
    }),
    visitor(now, 15, {
      visitor: "v_c3b702d811f0",
      session: "s_17de9b033",
      path: "/",
      referrer: "linkedin",
      country: "NL",
      city: "Rotterdam",
      device: "desktop",
      browser: "Edge 140",
      os: "Windows 11",
      botScore: 5,
      pages: 4,
      duration: 408,
      identified: true,
    }),
    visitor(now, 31, {
      visitor: "v_55e19a6cb002",
      session: "s_e4c17a280",
      path: "/blog/ev-winter-range",
      referrer: "news.ycombinator",
      country: "DE",
      city: "Berlin",
      device: "tablet",
      browser: "Safari",
      os: "iPadOS 26",
      botScore: 9,
      pages: 2,
      duration: 190,
    }),
    visitor(now, 45, {
      visitor: "v_a0f4d8e1c3a7",
      session: "s_6f02c55b7",
      path: "/sitemap.xml",
      referrer: null,
      country: "US",
      city: "Ashburn",
      device: "desktop",
      browser: "HeadlessChrome 141",
      os: "Linux",
      botScore: 92,
      pages: 2,
      duration: 1,
    }),
    visitor(now, 63, {
      visitor: "v_e4c1803f2d9b",
      session: "s_a9b1e7704",
      path: "/cars/kia-ev6",
      referrer: "google",
      country: "NL",
      city: "Utrecht",
      device: "mobile",
      browser: "Chrome 141",
      os: "Android 16",
      botScore: 41,
      pages: 5,
      duration: 65,
    }),
  ];
}

const quiet = {
  headless: false,
  webdriver: false,
  datacenterAsn: false,
  pointerEvents: null,
  uaMismatch: false,
  uniformDwell: null,
};

const details: VisitorBot[] = [
  {
    id: "v_a0f4d8e1c3a7",
    bot: {
      score: 92,
      verdict: "bot",
      signals: { ...quiet, headless: true, datacenterAsn: true, pointerEvents: false },
    },
  },
  {
    id: "v_e4c1803f2d9b",
    bot: { score: 41, verdict: "suspect", signals: { ...quiet, uniformDwell: true } },
  },
];

function session(
  now: number,
  seconds: number,
  partial: Omit<
    LiveSession,
    "startedAt" | "lastSeen" | "events" | "referrer" | "country" | "device"
  >,
): LiveSession {
  return {
    ...partial,
    startedAt: ago(now, seconds),
    lastSeen: ago(now, Math.max(0, seconds - Math.round(partial.durationMs / 1000))),
    events: partial.pages,
    referrer: null,
    country: "NL",
    device: "desktop",
  };
}

function sessions(now: number): LiveSession[] {
  return [
    session(now, 50, {
      id: "s_90aa21dc4",
      visitor: "v_19d0aa507e40",
      trail: ["/private-lease"],
      pages: 1,
      durationMs: 42_000,
      signal: "human",
      botScore: 2,
    }),
    session(now, 46, {
      id: "s_6f02c55b7",
      visitor: "v_a0f4d8e1c3a7",
      trail: ["/sitemap.xml", "/robots.txt"],
      pages: 2,
      durationMs: 1000,
      signal: "bot",
      botScore: 92,
    }),
    session(now, 128, {
      id: "s_a9b1e7704",
      visitor: "v_e4c1803f2d9b",
      trail: ["/", "/cars", "/cars/kia-ev6", "/cars", "/cars/tesla-model-3"],
      pages: 5,
      durationMs: 65_000,
      signal: "suspect",
      botScore: 41,
    }),
    session(now, 246, {
      id: "s_2b7f40a1e",
      visitor: "v_8f2a1c3e9c1e",
      trail: ["/", "/cars", "/cars/polestar-2"],
      pages: 3,
      durationMs: 242_000,
      signal: "engaged",
      botScore: 4,
    }),
    session(now, 221, {
      id: "s_e4c17a280",
      visitor: "v_55e19a6cb002",
      trail: ["/blog/ev-winter-range", "/blog"],
      pages: 2,
      durationMs: 190_000,
      signal: "engaged",
      botScore: 9,
    }),
    session(now, 423, {
      id: "s_17de9b033",
      visitor: "v_c3b702d811f0",
      trail: ["/", "/business", "/contact", "/"],
      pages: 4,
      durationMs: 408_000,
      signal: "engaged",
      botScore: 5,
    }),
  ];
}

function logs(now: number): LogLine[] {
  return [
    {
      id: "7",
      ts: ago(now, 49),
      level: "ok",
      kind: "jobs",
      source: "cron",
      message: "rollup_daily upserted 1,284 visitors in 412ms",
      visitor: null,
      session: null,
      data: { job: "rollup", visitors: 1284, pageviews: 3902, durationMs: 412, ok: true },
    },
    {
      id: "6",
      ts: ago(now, 31),
      level: "warn",
      kind: "signals",
      source: "engine",
      message: "bot score 92, headless and datacenter ASN",
      visitor: "v_a0f4d8e1c3a7",
      session: "s_6f02c55b7",
      data: {
        path: "/sitemap.xml",
        score: 92,
        signals: ["headless", "datacenterAsn"],
        verdict: "bot",
      },
    },
    {
      id: "5",
      ts: ago(now, 20),
      level: "ok",
      kind: "ingest",
      source: "sdk",
      message: "speed sample on /cars, LCP 1380 INP 96 CLS 0.02",
      visitor: "v_8f2a1c3e9c1e",
      session: "s_2b7f40a1e",
      data: { name: "speed", path: "/cars", lcp: 1380, inp: 96, cls: 0.02, ttfb: 210 },
    },
    {
      id: "4",
      ts: ago(now, 12),
      level: "info",
      kind: "pipeline",
      source: "sdk",
      message: "scroll_depth dropped before send, reason consent",
      visitor: "v_19d0aa507e40",
      session: "s_90aa21dc4",
      data: { outcome: "dropped", code: "consent", path: "/private-lease" },
    },
    {
      id: "3",
      ts: ago(now, 7),
      level: "error",
      kind: "ingest",
      source: "api",
      message: "RA_INGEST_REJECTED props exceed 25 keys on quote_requested",
      visitor: "v_c3b702d811f0",
      session: "s_17de9b033",
      data: {
        code: "RA_INGEST_REJECTED",
        reason: "VALIDATION_FAILED",
        index: 3,
        event: "quote_requested",
        field: "props",
        limit: 25,
        got: 31,
        path: "/contact",
        stored: false,
      },
    },
    {
      id: "2",
      ts: ago(now, 2),
      level: "warn",
      kind: "transport",
      source: "sdk",
      message: "batch b_70 retry 1/3 after 429, Retry-After 4s",
      visitor: "v_19d0aa507e40",
      session: "s_90aa21dc4",
      data: { batchId: "b_70", attempt: 1, status: 429, retryAfterMs: 4000, events: 7 },
    },
    {
      id: "1",
      ts: ago(now, 0),
      level: "ok",
      kind: "ingest",
      source: "api",
      message: "batch b_71 accepted 12 events (202)",
      visitor: null,
      session: null,
      data: { batchId: "b_71", accepted: 12, duplicates: 0, rejected: 0, latencyMs: 38 },
    },
  ];
}

const speed: SpeedRoute[] = [
  { route: "/", score: 94, samples: 1044, lcp: 1100, inp: 64, cls: 0.01, fcp: 800, ttfb: 140 },
  { route: "/cars", score: 88, samples: 612, lcp: 1600, inp: 88, cls: 0.03, fcp: 1000, ttfb: 210 },
  {
    route: "/cars/[slug]",
    score: 71,
    samples: 488,
    lcp: 2700,
    inp: 140,
    cls: 0.04,
    fcp: 1500,
    ttfb: 610,
  },
  {
    route: "/private-lease",
    score: 80,
    samples: 388,
    lcp: 2300,
    inp: 180,
    cls: 0.06,
    fcp: 1300,
    ttfb: 320,
  },
  {
    route: "/blog/[slug]",
    score: 48,
    samples: 201,
    lcp: 3400,
    inp: 96,
    cls: 0.14,
    fcp: 2100,
    ttfb: 890,
  },
  {
    route: "/contact",
    score: 76,
    samples: 97,
    lcp: 1300,
    inp: 260,
    cls: 0.02,
    fcp: 900,
    ttfb: 190,
  },
];

function issues(now: number): Issue[] {
  return [
    {
      id: "i_slug",
      title: "TypeError: Cannot read properties of undefined (reading 'slug')",
      culprit: "app/cars/[slug]/page.tsx:42",
      level: "error",
      status: "open",
      isRegression: false,
      count: 18,
      visitors: 11,
      firstSeen: ago(now, 7400),
      lastSeen: ago(now, 110),
      firstRelease: "2026.10.03-a1",
      lastRelease: "2026.10.03-a1",
      resolvedAt: null,
    },
    {
      id: "i_chunk",
      title: "ChunkLoadError: Loading chunk 412 failed",
      culprit: "_next/static/chunks/412.js",
      level: "warning",
      status: "open",
      isRegression: true,
      count: 6,
      visitors: 6,
      firstSeen: ago(now, 3600),
      lastSeen: ago(now, 1400),
      firstRelease: "2026.10.02-f9",
      lastRelease: "2026.10.02-f9",
      resolvedAt: null,
    },
    {
      id: "i_hydration",
      title: "Hydration mismatch in <PriceTable>",
      culprit: "components/price-table.tsx:17",
      level: "warning",
      status: "open",
      isRegression: false,
      count: 3,
      visitors: 2,
      firstSeen: ago(now, 6900),
      lastSeen: ago(now, 1660),
      firstRelease: "2026.10.03-a1",
      lastRelease: "2026.10.03-a1",
      resolvedAt: null,
    },
  ];
}

function issueEvent(
  now: number,
  id: string,
  browser: string,
  error: IssueEvent["error"],
  crumbs: string[],
): IssueEvent {
  return {
    id,
    ts: ago(now, 110),
    visitor: "v_8f2a1c3e9c1e",
    release: "2026.10.03-a1",
    environment: "production",
    page: { path: "/cars/undefined" },
    error,
    breadcrumbs: crumbs.map((message, index) => ({
      ts: ago(now, 120 - index * 3),
      kind: index === 0 ? "click" : "navigation",
      message,
    })),
    device: {
      type: "desktop",
      browser,
      browserVersion: null,
      os: "macOS",
      osVersion: null,
      screen: null,
      viewport: null,
      language: "nl-NL",
      connection: null,
    },
  };
}

function issueEvents(now: number): { [issue: string]: IssueEvent[] } {
  const slug = {
    type: "TypeError",
    message: "Cannot read properties of undefined (reading 'slug')",
    stack: [
      { file: "app/cars/[slug]/page.tsx", line: 42, column: 19, function: "CarPage", inApp: true },
      { file: "react-dom", line: 1234, column: null, function: "renderWithHooks", inApp: false },
    ],
  };
  const chunk = {
    type: "ChunkLoadError",
    message: "Loading chunk 412 failed",
    stack: [
      {
        file: "_next/static/chunks/webpack.js",
        line: 1,
        column: null,
        function: null,
        inApp: false,
      },
    ],
  };
  const hydration = {
    type: "Error",
    message: 'Text content did not match. Server: "649" Client: "649,00"',
    stack: [
      {
        file: "components/price-table.tsx",
        line: 17,
        column: 5,
        function: "PriceTable",
        inApp: true,
      },
    ],
  };
  const configure = ["click Configure", "navigate /cars/undefined"];
  return {
    i_slug: [
      issueEvent(now, "e1", "Safari", slug, configure),
      issueEvent(now, "e2", "Chrome", slug, configure),
    ],
    i_chunk: [issueEvent(now, "e3", "Chrome", chunk, ["navigate /blog"])],
    i_hydration: [issueEvent(now, "e4", "Safari", hydration, ["navigate /private-lease"])],
  };
}

function overview(now: number): Overview {
  return {
    online: 6,
    viewsPerMinute: [4, 6, 5, 8, 7, 10, 9, 12, 11, 14],
    today: { visitors: 1284, pageviews: 3902, bounceRate: 0.41, avgSessionSeconds: 134 },
    ingest: { last24h: { accepted: 3890, duplicates: 48, rejected: 12, rateLimited: 0 } },
    bots: { share: 0.078, headless: 3, webdriver: 1, datacenterAsn: 14 },
    speed: { lcp: 1400, inp: 96, cls: 0.03, ttfb: 240 },
    errors: { last30m: 3, openIssues: 3 },
    topPages: [
      { path: "/", views: 1044 },
      { path: "/cars", views: 612 },
      { path: "/private-lease", views: 388 },
      { path: "/blog/ev-winter-range", views: 201 },
    ],
    referrers: [
      { name: "google", share: 0.48 },
      { name: "direct", share: 0.31 },
      { name: "news.ycombinator", share: 0.09 },
      { name: "linkedin", share: 0.06 },
    ],
    countries: [
      { code: "NL", share: 0.71 },
      { code: "BE", share: 0.12 },
      { code: "DE", share: 0.08 },
    ],
    release: { current: "2026.10.03-a1", deployedAt: ago(now, 8400), newIssuesSince: 3 },
  };
}

/**
 * @name createFixtures
 * @description Typed sample answers of the widget's routes, in the API's shapes: six visitors
 * and their sessions, seven log lines, speed per route, three error groups and an overview, with
 * times relative to `now`.
 *
 * @example
 * const fixtures = createFixtures(Date.now());
 * fixtures.visitors.length; // 6
 */
export function createFixtures(now: number): Fixtures {
  return {
    session: {
      project: "site",
      projectName: "noorderlicht-lease",
      publicKey: "pk_fixture",
      access: "admin",
      user: { id: "u_admin", name: "admin" },
      release: "2026.10.03-a1",
      token: "wt_fixture",
      expiresAt: new Date(now + 15 * 60_000).toISOString(),
      features: { logs: true, speed: true, issues: true, reports: false },
    },
    visitors: visitors(now),
    details,
    sessions: sessions(now),
    logs: logs(now),
    overview: overview(now),
    speed,
    issues: issues(now),
    issueEvents: issueEvents(now),
  };
}
