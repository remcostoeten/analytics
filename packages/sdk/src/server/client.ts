import type { IngestResult, WireContext, WireEvent } from "@remcostoeten/analytics-contract";

import { buildEvent, limitProps } from "../core/build-event";
import { mergeConfig, parseConfig, readEnv } from "../core/config";
import type { ErrorContext, EventMap, EventName, GroupMap, Props } from "../core/types";
import { uuidv7 } from "../core/uuid";
import { eventsUrl, runtimeWaitUntil, visitorDetails } from "./forwarding";
import type {
  Fetcher,
  Handler,
  RequestContext,
  ServerAnalytics,
  ServerArgs,
  ServerConfig,
  ServerError,
  ServerErrorCode,
  ServerResult,
} from "./types";

const batchLimit = 50;
const nothing: ServerResult = { ok: true, error: null, accepted: 0, duplicates: 0, failed: 0 };

function pathOf(request: Request | undefined) {
  if (!request) return "/";
  try {
    return new URL(request.url).pathname.slice(0, 2048) || "/";
  } catch {
    return "/";
  }
}

function describe(error: unknown) {
  return error instanceof Error
    ? { type: error.name, message: error.message, stack: error.stack }
    : { type: "Error", message: String(error) };
}

function failed(code: ServerErrorCode, message: string, count: number): ServerResult {
  return { ok: false, error: { code, message }, accepted: 0, duplicates: 0, failed: count };
}

/**
 * @name createServerAnalytics
 * @description The server client for route handlers, jobs and webhooks. Events tracked in the
 * same tick go out together, authenticated with the project secret. Passing the incoming
 * `request` (or its `headers`) forwards the visitor's IP and user agent, and `waitUntil` from the
 * options, the call or Vercel's runtime keeps the send alive after the response. Every method
 * resolves to `{ ok, error, accepted, duplicates, failed }` and never throws. Options missing
 * here are read from the JSON in `RA_CONFIG`.
 *
 * @example
 * const serverAnalytics = createServerAnalytics<Events>({ project: "remcostoeten.nl", secret: env.RA_SECRET, endpoint: "https://api.remcostoeten.nl" });
 * await serverAnalytics.track("checkout", { revenue: 49, currency: "EUR", orderId: "order_1" }, { request });
 */
export function createServerAnalytics<
  Events extends EventMap = EventMap,
  Groups extends GroupMap = GroupMap,
>(options: ServerConfig = {}): ServerAnalytics<Events, Groups> {
  const config = mergeConfig(parseConfig(readEnv(() => process.env.RA_CONFIG)), options);
  const request: Fetcher = config.fetch ?? ((url, init) => fetch(url, init));
  const warned = new Set<ServerErrorCode>();
  let pending: WireEvent[] = [];
  let scheduled: Promise<ServerResult> | null = null;

  function warn(error: ServerError) {
    if (warned.has(error.code)) return;
    warned.add(error.code);
    console.warn(`[ra] ${error.code}: ${error.message}`);
  }

  async function post(events: WireEvent[], secret: string, url: string): Promise<ServerResult> {
    try {
      const response = await request(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
        body: JSON.stringify({ v: 1, sentAt: new Date().toISOString(), events }),
      });
      if (!response.ok) {
        return failed("RA_INGEST_FAILED", `HTTP ${response.status}`, events.length);
      }
      const result = (await response.json()) as IngestResult;
      const counts = {
        accepted: result.accepted,
        duplicates: result.duplicates,
        failed: result.rejected.length,
      };
      const [first] = result.rejected;
      if (!first) return { ok: true, error: null, ...counts };
      return {
        ok: false,
        error: { code: "RA_INGEST_REJECTED", message: `${first.code}: ${first.message}` },
        ...counts,
      };
    } catch (error) {
      return failed("RA_INGEST_FAILED", describe(error).message, events.length);
    }
  }

  async function send(events: WireEvent[]): Promise<ServerResult> {
    if (!config.secret) return failed("RA_NO_SECRET", "secret is empty", events.length);
    if (!config.endpoint) return failed("RA_NO_ENDPOINT", "endpoint is empty", events.length);
    const url = eventsUrl(config.endpoint);
    let total = nothing;
    for (let start = 0; start < events.length; start += batchLimit) {
      const result = await post(events.slice(start, start + batchLimit), config.secret, url);
      const counts = {
        accepted: total.accepted + result.accepted,
        duplicates: total.duplicates + result.duplicates,
        failed: total.failed + result.failed,
      };
      total = total.ok ? { ...result, ...counts } : { ...total, ...counts };
    }
    return total;
  }

  async function drain(): Promise<ServerResult> {
    const events = pending;
    pending = [];
    if (events.length === 0) return nothing;
    const result = await send(events);
    if (result.error) warn(result.error);
    return result;
  }

  function flush() {
    return scheduled ?? drain();
  }

  function context(
    name: string,
    props: { [key: string]: unknown },
    tags: Props,
    from: RequestContext,
  ): WireEvent {
    const headers = from.request?.headers ?? from.headers;
    const visitor = headers ? visitorDetails(headers) : null;
    const wire: WireContext = {};
    if (config.release) wire.release = config.release;
    if (visitor?.ip) wire.ip = visitor.ip;
    if (visitor?.userAgent) wire.ua = visitor.userAgent.slice(0, 2048);
    const now = Date.now();
    const event = buildEvent({
      id: uuidv7(now),
      name,
      ts: new Date(now).toISOString(),
      visitor: from.visitor ?? "server",
      session: from.session ?? "server",
      page: { path: from.path ?? pathOf(from.request), route: null, title: null, referrer: null },
      props: limitProps({ ...tags, ...props }, name === "error").props,
      context: wire,
    });
    if (from.groups && Object.keys(from.groups).length > 0) event.groups = from.groups;
    return event;
  }

  function enqueue(event: WireEvent, from: RequestContext) {
    pending.push(event);
    scheduled ??= Promise.resolve().then(() => {
      scheduled = null;
      return drain();
    });
    (from.waitUntil ?? config.waitUntil ?? runtimeWaitUntil())?.(scheduled);
    return scheduled;
  }

  function capture(
    message: string,
    fallback: "error" | "warning",
    from: ErrorContext & RequestContext,
    tags: Props,
    extra: Props,
  ) {
    const props = {
      ...from.tags,
      ...extra,
      message,
      level: from.level ?? fallback,
      ...(from.fingerprint ? { fingerprint: from.fingerprint } : {}),
    };
    return enqueue(context("error", props, tags, from), from);
  }

  function methods(tags: Props): ServerAnalytics<Events, Groups> {
    function track<Name extends EventName<Events>>(name: Name, ...args: ServerArgs<Events, Name>) {
      const [props = {}, from = {}] = args;
      return enqueue(context(name, props, tags, from), from);
    }

    function captureError(error: unknown, from: ErrorContext & RequestContext = {}) {
      const { type, message, stack } = describe(error);
      return capture(message, "error", from, tags, { type, ...(stack ? { stack } : {}) });
    }

    function withErrors<Args extends unknown[]>(handler: Handler<Args>): Handler<Args> {
      return async (incoming, ...args) => {
        try {
          return await handler(incoming, ...args);
        } catch (error) {
          const sending = captureError(error, { request: incoming });
          if (!(config.waitUntil ?? runtimeWaitUntil())) await sending;
          throw error;
        }
      };
    }

    return {
      track,
      identify: (userId, traits = {}, from = {}) =>
        enqueue(context("identify", { ...traits, userId }, tags, from), from),
      group: (type, id, traits, from = {}) => {
        const joined = { ...from, groups: { ...from.groups, [type]: id } };
        return enqueue(
          context("group", { ...traits, groupType: type, groupId: id }, tags, joined),
          joined,
        );
      },
      captureError,
      captureMessage: (message, from = {}) => capture(message, "warning", from, tags, {}),
      scope: (more) => methods({ ...tags, ...more }),
      withErrors,
      flush,
      shutdown: flush,
    };
  }

  return methods({});
}
