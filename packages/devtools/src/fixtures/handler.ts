import type { Fetcher } from "@spoar/shared/http";
import type { Milliseconds } from "@spoar/shared/semantic";

import type { LiveEvent, LogEntry } from "../client/types";
import { createFixtures } from "./data";

export type FixtureOptions = {
  now?: () => number;
  liveMs?: Milliseconds;
};

export type FixtureHandler = (request: Request) => Promise<Response>;

const paths = ["/", "/cars", "/cars/polestar-2", "/private-lease", "/blog", "/contact"];

const samples: Pick<LogEntry, "level" | "outcome" | "kind" | "source" | "message">[] = [
  {
    level: "info",
    outcome: "sent",
    kind: "ingest",
    source: "api",
    message: "batch accepted 4 events (202)",
  },
  {
    level: "info",
    outcome: "sent",
    kind: "ingest",
    source: "sdk",
    message: "pageview sent",
  },
  {
    level: "warn",
    outcome: "retry",
    kind: "transport",
    source: "sdk",
    message: "batch retry 1/3 after a network error",
  },
  {
    level: "info",
    outcome: "dropped",
    kind: "pipeline",
    source: "sdk",
    message: "click dropped before send, reason sampling",
  },
];

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
 * @description Answers the widget's routes from typed fixtures, as a fetch-standard handler, so
 * the panel runs before the widget endpoints exist: in a browser through `fixtureFetch`, or on a
 * server such as the e2e site. Live routes long-poll and add one generated row every `liveMs`.
 *
 * @example
 * Bun.serve({ fetch: createFixtureHandler() });
 */
export function createFixtureHandler(options: FixtureOptions = {}): FixtureHandler {
  const now = options.now ?? (() => Date.now());
  const liveMs = options.liveMs ?? 3000;
  const data = createFixtures(now());
  let sequence = 0;

  function nextLog(): LogEntry {
    sequence += 1;
    const sample = samples[sequence % samples.length] ?? samples[0];
    const path = paths[sequence % paths.length] ?? "/";
    return {
      ...sample,
      id: `live_${sequence}`,
      at: new Date(now()).toISOString(),
      code: null,
      visitor: data.visitors[sequence % data.visitors.length]?.id ?? null,
      path,
      data: { sequence, path, latencyMs: 20 + (sequence % 7) * 6 },
    };
  }

  function nextEvent(): LiveEvent {
    sequence += 1;
    return {
      id: `event_${sequence}`,
      project: data.bootstrap.project.id,
      name: "pageview",
      ts: new Date(now()).toISOString(),
      path: paths[sequence % paths.length] ?? "/",
      country: "NL",
      device: "desktop",
    };
  }

  async function live(request: Request, after: string | null, make: () => LiveEvent | LogEntry) {
    if (!after) return json({ data: [], nextCursor: `c${sequence}` });
    await wait(liveMs, request.signal);
    if (request.signal.aborted) return json({ data: [], nextCursor: after });
    const item = make();
    return json({ data: [item], nextCursor: `c${sequence}` });
  }

  return async (request) => {
    const url = new URL(request.url);
    const route = url.pathname.replace(/^\/v2\/projects\/[^/]+\//, "");
    const after = url.searchParams.get("after");
    if (url.pathname === "/v2/widget/session") return json({ data: data.bootstrap });
    if (route === "realtime/visitors") return json({ data: data.visitors, nextCursor: null });
    if (route === "realtime/sessions") return json({ data: data.sessions, nextCursor: null });
    if (route === "realtime/events") return live(request, after, nextEvent);
    if (route === "overview") return json({ data: data.overview });
    if (route === "speed/routes") return json({ data: data.speed, nextCursor: null });
    if (route === "issues") return json({ data: data.issues, nextCursor: null });
    if (route === "logs/client") return json({ accepted: true }, 202);
    if (route === "logs") {
      if (!after) return json({ data: data.logs, nextCursor: `c${sequence}` });
      return live(request, after, nextLog);
    }
    const visitor = /^visitors\/([^/]+)$/.exec(route)?.[1];
    if (visitor) {
      const id = decodeURIComponent(visitor);
      const found = data.details.find((detail) => detail.id === id);
      const score = data.visitors.find((row) => row.id === id)?.botScore ?? 0;
      return json({ data: found ?? { id, botScore: score, botSignals: [] } });
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
 * widget's `fetch` option on a page without the widget endpoints.
 *
 * @example
 * mount({ endpoint: location.origin, project: "site", fetch: fixtureFetch() });
 */
export function fixtureFetch(options: FixtureOptions = {}): Fetcher {
  const handle = createFixtureHandler(options);
  return (url, init) => handle(new Request(url, init));
}
