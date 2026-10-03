import type {
  Bootstrap,
  Issue,
  IssueEvent,
  LiveSession,
  LogEntry,
  OnlineVisitor,
  Overview,
  SpeedRoute,
  VisitorDetail,
} from "../client/types";

export type Fixtures = {
  bootstrap: Bootstrap;
  visitors: OnlineVisitor[];
  details: VisitorDetail[];
  sessions: LiveSession[];
  logs: LogEntry[];
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
  partial: Omit<OnlineVisitor, "seenAt" | "consent" | "userId"> &
    Partial<Pick<OnlineVisitor, "consent" | "userId">>,
): OnlineVisitor {
  return { consent: "granted", userId: null, ...partial, seenAt: ago(now, seconds) };
}

function visitors(now: number): OnlineVisitor[] {
  return [
    visitor(now, 4, {
      id: "v_8f2a1c3e9c1e",
      session: "s_2b7f40a1e",
      path: "/cars/polestar-2",
      referrer: "google",
      country: "NL",
      city: "Amsterdam",
      device: "desktop",
      botScore: 0.04,
      pages: 3,
      durationMs: 242_000,
      trail: ["/", "/cars", "/cars/polestar-2"],
      client: { os: "macOS", browser: "Safari 26", screen: "1728x1117", language: "nl-NL" },
      vitals: { lcp: 1100, inp: 48, cls: 0.01 },
    }),
    visitor(now, 8, {
      id: "v_19d0aa507e40",
      session: "s_90aa21dc4",
      path: "/private-lease",
      referrer: null,
      country: "BE",
      city: "Antwerp",
      device: "mobile",
      botScore: 0.02,
      pages: 1,
      durationMs: 42_000,
      trail: ["/private-lease"],
      client: { os: "iOS 26", browser: "Safari", screen: "393x852", language: "nl-BE" },
      vitals: { lcp: 2300, inp: 180, cls: 0.06 },
      consent: "unset",
    }),
    visitor(now, 15, {
      id: "v_c3b702d811f0",
      session: "s_17de9b033",
      path: "/",
      referrer: "linkedin",
      country: "NL",
      city: "Rotterdam",
      device: "desktop",
      botScore: 0.05,
      pages: 4,
      durationMs: 408_000,
      trail: ["/", "/business", "/contact", "/"],
      client: { os: "Windows 11", browser: "Edge 140", screen: "1920x1080", language: "nl-NL" },
      vitals: { lcp: 1400, inp: 72, cls: 0.02 },
      userId: "u_4410",
    }),
    visitor(now, 31, {
      id: "v_55e19a6cb002",
      session: "s_e4c17a280",
      path: "/blog/ev-winter-range",
      referrer: "news.ycombinator",
      country: "DE",
      city: "Berlin",
      device: "tablet",
      botScore: 0.09,
      pages: 2,
      durationMs: 190_000,
      trail: ["/blog/ev-winter-range", "/blog"],
      client: { os: "iPadOS 26", browser: "Safari", screen: "1024x1366", language: "de-DE" },
      vitals: { lcp: 1900, inp: 96, cls: 0.03 },
    }),
    visitor(now, 45, {
      id: "v_a0f4d8e1c3a7",
      session: "s_6f02c55b7",
      path: "/sitemap.xml",
      referrer: null,
      country: "US",
      city: "Ashburn",
      device: "desktop",
      botScore: 0.92,
      pages: 2,
      durationMs: 1000,
      trail: ["/sitemap.xml", "/robots.txt"],
      client: { os: "Linux", browser: "HeadlessChrome 141", screen: "800x600", language: null },
      vitals: { lcp: null, inp: null, cls: null },
    }),
    visitor(now, 63, {
      id: "v_e4c1803f2d9b",
      session: "s_a9b1e7704",
      path: "/cars/kia-ev6",
      referrer: "google",
      country: "NL",
      city: "Utrecht",
      device: "mobile",
      botScore: 0.41,
      pages: 5,
      durationMs: 65_000,
      trail: ["/", "/cars", "/cars/kia-ev6", "/cars", "/cars/tesla-model-3"],
      client: { os: "Android 16", browser: "Chrome 141", screen: "412x915", language: "nl-NL" },
      vitals: { lcp: 2800, inp: 240, cls: 0.12 },
    }),
  ];
}

const details: VisitorDetail[] = [
  {
    id: "v_a0f4d8e1c3a7",
    botScore: 0.92,
    botSignals: [
      { reason: "client_headless", weight: 25 },
      { reason: "asn_datacenter", weight: 40 },
      { reason: "client_no_input", weight: 20 },
    ],
  },
  {
    id: "v_e4c1803f2d9b",
    botScore: 0.41,
    botSignals: [{ reason: "session_velocity", weight: 50 }],
  },
];

function session(
  now: number,
  seconds: number,
  partial: Omit<LiveSession, "startedAt">,
): LiveSession {
  return { ...partial, startedAt: ago(now, seconds) };
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
      botScore: 0.02,
    }),
    session(now, 46, {
      id: "s_6f02c55b7",
      visitor: "v_a0f4d8e1c3a7",
      trail: ["/sitemap.xml", "/robots.txt"],
      pages: 2,
      durationMs: 1000,
      signal: "bot",
      botScore: 0.92,
    }),
    session(now, 128, {
      id: "s_a9b1e7704",
      visitor: "v_e4c1803f2d9b",
      trail: ["/", "/cars", "/cars/kia-ev6", "/cars", "/cars/tesla-model-3"],
      pages: 5,
      durationMs: 65_000,
      signal: "suspect",
      botScore: 0.41,
    }),
    session(now, 246, {
      id: "s_2b7f40a1e",
      visitor: "v_8f2a1c3e9c1e",
      trail: ["/", "/cars", "/cars/polestar-2"],
      pages: 3,
      durationMs: 242_000,
      signal: "human",
      botScore: 0.04,
    }),
    session(now, 221, {
      id: "s_e4c17a280",
      visitor: "v_55e19a6cb002",
      trail: ["/blog/ev-winter-range", "/blog"],
      pages: 2,
      durationMs: 190_000,
      signal: "human",
      botScore: 0.09,
    }),
    session(now, 423, {
      id: "s_17de9b033",
      visitor: "v_c3b702d811f0",
      trail: ["/", "/business", "/contact", "/"],
      pages: 4,
      durationMs: 408_000,
      signal: "engaged",
      botScore: 0.05,
    }),
  ];
}

function logs(now: number): LogEntry[] {
  return [
    {
      id: "l7",
      at: ago(now, 49),
      level: "info",
      outcome: "job",
      kind: "jobs",
      source: "cron",
      message: "rollup_daily upserted 1,284 visitors in 412ms",
      code: null,
      visitor: null,
      path: null,
      data: { job: "rollup", visitors: 1284, pageviews: 3902, durationMs: 412, ok: true },
    },
    {
      id: "l6",
      at: ago(now, 31),
      level: "warn",
      outcome: "signal",
      kind: "signals",
      source: "engine",
      message: "bot score 0.92, headless and datacenter ASN",
      code: null,
      visitor: "v_a0f4d8e1c3a7",
      path: "/sitemap.xml",
      data: {
        visitor: "v_a0f4d8e1c3a7",
        score: 0.92,
        signals: {
          headless: true,
          webdriver: false,
          datacenterAsn: true,
          pointerEvents: 0,
          uaMismatch: null,
        },
        verdict: "bot",
      },
    },
    {
      id: "l5",
      at: ago(now, 20),
      level: "info",
      outcome: "sent",
      kind: "ingest",
      source: "sdk",
      message: "speed sample on /cars, LCP 1380 INP 96 CLS 0.02",
      code: null,
      visitor: "v_8f2a1c3e9c1e",
      path: "/cars",
      data: { name: "speed", path: "/cars", lcp: 1380, inp: 96, cls: 0.02, ttfb: 210 },
    },
    {
      id: "l4",
      at: ago(now, 12),
      level: "info",
      outcome: "dropped",
      kind: "pipeline",
      source: "sdk",
      message: "scroll_depth dropped before send, reason consent",
      code: null,
      visitor: "v_19d0aa507e40",
      path: "/private-lease",
      data: {
        event: "scroll_depth",
        reason: "consent",
        consent: "unset",
        visitor: "v_19d0aa507e40",
      },
    },
    {
      id: "l3",
      at: ago(now, 7),
      level: "error",
      outcome: "rejected",
      kind: "ingest",
      source: "api",
      message: "RA_INGEST_REJECTED props exceed 25 keys on quote_requested",
      code: "RA_INGEST_REJECTED",
      visitor: "v_c3b702d811f0",
      path: "/contact",
      data: {
        code: "RA_INGEST_REJECTED",
        reason: "VALIDATION_FAILED",
        index: 3,
        event: "quote_requested",
        field: "props",
        limit: 25,
        got: 31,
        visitor: "v_c3b702d811f0",
        stored: false,
      },
    },
    {
      id: "l2",
      at: ago(now, 2),
      level: "warn",
      outcome: "retry",
      kind: "transport",
      source: "sdk",
      message: "batch b_70 retry 1/3 after 429, Retry-After 4s",
      code: null,
      visitor: "v_19d0aa507e40",
      path: "/private-lease",
      data: { batchId: "b_70", attempt: 1, status: 429, retryAfterMs: 4000, events: 7 },
    },
    {
      id: "l1",
      at: ago(now, 0),
      level: "info",
      outcome: "sent",
      kind: "ingest",
      source: "api",
      message: "batch b_71 accepted 12 events (202)",
      code: null,
      visitor: null,
      path: null,
      data: { batchId: "b_71", accepted: 12, duplicates: 0, rejected: [], latencyMs: 38 },
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
    online: 27,
    viewsPerMinute: [4, 6, 5, 8, 7, 10, 9, 12, 11, 14],
    today: { visitors: 1284, pageviews: 3902, bounceRate: 0.41, sessionMs: 134_000 },
    ingest: { accepted: 3890, rejected: 12, duplicates: 48, ratio: 0.996 },
    bots: {
      share: 0.078,
      reasons: [
        { label: "client_headless", value: 3 },
        { label: "client_webdriver", value: 1 },
        { label: "asn_datacenter", value: 14 },
      ],
    },
    topPages: [
      { label: "/", value: 1044 },
      { label: "/cars", value: 612 },
      { label: "/private-lease", value: 388 },
      { label: "/blog/ev-winter-range", value: 201 },
    ],
    referrers: [
      { label: "google", value: 0.48 },
      { label: "direct", value: 0.31 },
      { label: "news.ycombinator", value: 0.09 },
      { label: "linkedin", value: 0.06 },
    ],
    countries: [
      { label: "NL", value: 0.71 },
      { label: "BE", value: 0.12 },
      { label: "DE", value: 0.08 },
      { label: "other", value: 0.09 },
    ],
    release: { name: "2026.10.03-a1", deployedAt: ago(now, 8400), newIssues: 3 },
    lcp: 1400,
    errors: 3,
    config: {
      project: "site",
      endpoint: "/_ra",
      consent: "required",
      plugins: ["pageviews", "speedInsights", "errors", "scrollDepth", "outboundLinks"],
      sampleRate: 1,
      release: "2026.10.03-a1",
    },
  };
}

/**
 * @name createFixtures
 * @description The typed sample data the fixture transport serves until the widget endpoints
 * exist: six visitors and their sessions, seven log rows, speed per route, three error groups
 * and an overview, with times relative to `now`.
 *
 * @example
 * const fixtures = createFixtures(Date.now());
 * fixtures.visitors.length; // 6
 */
export function createFixtures(now: number): Fixtures {
  return {
    bootstrap: {
      token: "wt_fixture",
      expiresAt: new Date(now + 15 * 60_000).toISOString(),
      project: { id: "site", name: "noorderlicht-lease", environment: "production" },
      user: { name: "admin" },
      widgetReports: false,
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
