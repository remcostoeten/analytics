import type { Fetcher } from "@spoar/shared/http";
import type { Milliseconds } from "@spoar/shared/semantic";

import type { LiveEvent, LogLine } from "@spoar/contract";

import { createFixtures } from "./data";

export type FixtureOptions = {
  now?: () => number;
  liveMs?: Milliseconds;
};

export type FixtureHandler = (request: Request) => Promise<Response>;

const paths = ["/", "/cars", "/cars/polestar-2", "/private-lease", "/blog", "/contact"];

const samples: Pick<LogLine, "level" | "kind" | "source" | "message">[] = [
  { level: "ok", kind: "ingest", source: "api", message: "batch accepted 4 events (202)" },
  { level: "ok", kind: "ingest", source: "sdk", message: "pageview sent" },
  {
    level: "warn",
    kind: "transport",
    source: "sdk",
    message: "batch retry 1/3 after a network error",
  },
  {
    level: "info",
    kind: "pipeline",
    source: "sdk",
    message: "click dropped before send, reason sampling",
  },
];

const firstLiveLog = 100;

function json<Body>(body: Body, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function wait(ms: number, signal: AbortSignal | null) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * @name createFixtureHandler
 * @description Answers the widget's HTTP routes from typed fixtures in the API's shapes, as a
 * fetch-standard handler, so the panel runs without an API: in a browser through `fixtureFetch`,
 * or on a server such as the e2e site. Live routes long-poll and add one generated row every
 * `liveMs`. It has no WebSocket, so the panel falls back to polling, or skips the socket with
 * `live: false`.
 *
 * @example
 * Bun.serve({ fetch: createFixtureHandler() });
 */
export function createFixtureHandler(options: FixtureOptions = {}): FixtureHandler {
  const now = options.now ?? (() => Date.now());
  const liveMs = options.liveMs ?? 3000;
  const data = createFixtures(now());
  let sequence = 0;

  function nextLog(): LogLine {
    sequence += 1;
    const sample = samples[sequence % samples.length] ?? samples[0];
    const path = paths[sequence % paths.length] ?? "/";
    const visitor = data.visitors[sequence % data.visitors.length];
    return {
      ...sample,
      id: String(firstLiveLog + sequence),
      ts: new Date(now()).toISOString(),
      visitor: visitor?.visitor ?? null,
      session: visitor?.session ?? null,
      data: { sequence, path, latencyMs: 20 + (sequence % 7) * 6 },
    };
  }

  function nextEvent(): LiveEvent {
    sequence += 1;
    return {
      id: `event_${sequence}`,
      project: data.session.project,
      name: "pageview",
      ts: new Date(now()).toISOString(),
      path: paths[sequence % paths.length] ?? "/",
      country: "NL",
      device: "desktop",
    };
  }

  function cursor() {
    return String(firstLiveLog + sequence);
  }

  async function live(request: Request, after: string | null, make: () => LiveEvent | LogLine) {
    if (!after) return json({ data: [], nextCursor: cursor() });
    await wait(liveMs, request.signal);
    if (request.signal.aborted) return json({ data: [], nextCursor: after });
    const item = make();
    return json({ data: [item], nextCursor: cursor() });
  }

  function range() {
    return { from: new Date(now() - 5 * 60_000).toISOString(), to: new Date(now()).toISOString() };
  }

  return async (request) => {
    const url = new URL(request.url);
    const route = url.pathname.replace(/^\/v2\/projects\/[^/]+\//, "");
    const after = url.searchParams.get("after");
    if (url.pathname === "/v2/widget/session") return json(data.session);
    if (route === "realtime/visitors") return json({ data: data.visitors, window: range() });
    if (route === "realtime/sessions") return json({ data: data.sessions, window: range() });
    if (route === "realtime/events") return live(request, after, nextEvent);
    if (route === "overview") return json(data.overview);
    if (route === "speed/routes") return json({ data: data.speed, nextCursor: null });
    if (route === "issues") return json({ data: data.issues, nextCursor: null });
    if (route === "logs/client") {
      const body: { logs: unknown[] } = await request.json();
      return json({ accepted: body.logs.length }, 202);
    }
    if (route === "logs") {
      if (!after) return json({ data: data.logs, nextCursor: cursor() });
      return live(request, after, nextLog);
    }
    const visitor = /^visitors\/([^/]+)$/.exec(route)?.[1];
    if (visitor) {
      const id = decodeURIComponent(visitor);
      const found = data.details.find((detail) => detail.id === id);
      const score = data.visitors.find((row) => row.visitor === id)?.botScore ?? 0;
      const bot = { score, verdict: "human", signals: {} };
      return json({ data: found ?? { id, bot } });
    }
    const issue = /^issues\/([^/]+)\/events$/.exec(route)?.[1];
    if (issue) {
      const events = data.issueEvents[decodeURIComponent(issue)] ?? [];
      return json({ data: events, nextCursor: null });
    }
    return json({ error: { code: "NOT_FOUND", message: `${url.pathname} has no fixture` } }, 404);
  };
}

/**
 * @name fixtureFetch
 * @description A `fetch` replacement that answers from `createFixtureHandler`, to pass as the
 * widget's `fetch` option on a page without an API, with `live: false`.
 *
 * @example
 * mount({ endpoint: location.origin, project: "site", fetch: fixtureFetch(), live: false });
 */
export function fixtureFetch(options: FixtureOptions = {}): Fetcher {
  const handle = createFixtureHandler(options);
  return (url, init) => handle(new Request(url, init));
}
