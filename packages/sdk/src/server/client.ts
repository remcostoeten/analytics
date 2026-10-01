import type { IngestResult, WireContext, WireEvent } from "@remcostoeten/analytics-contract";
import { maxEventsPerBatch } from "@remcostoeten/analytics-contract/limits";
import { hasKeys } from "@remcostoeten/analytics-shared/records";

import { buildEvent, limitProps } from "../core/build-event";
import { mergeConfig, parseConfig, readEnv } from "../core/config";
import type { ErrorContext, EventMap, EventName, GroupMap, Props } from "../core/types";
import { uuidv7 } from "../core/uuid";
import {
  adminSessionCookie,
  eventsUrl,
  runtimeWaitUntil,
  siteOrigin,
  visitorDetails,
} from "./forwarding";
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

type Outgoing = {
  origin: string | null;
  cookie: string | null;
  events: WireEvent[];
};

const nothing: ServerResult = { ok: true, error: null, accepted: 0, duplicates: 0, failed: 0 };

function pathOf(request: Request | undefined) {
  if (!request) return "/";
  try {
    return new URL(request.url).pathname.slice(0, 2048) || "/";
  } catch {
    return "/";
  }
}

/**
 * @name serverVisitor
 * @description The visitor and session id of server events tracked without a `visitor` or
 * `session` in their context. Every such event shares it, so reads leave it out of visitor and
 * session counts.
 *
 * @example
 * serverAnalytics.track("nightly_import"); // sent with visitor "server" and session "server"
 */
export const serverVisitor = "server";

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
 * `request` (or its `headers`) forwards the visitor's IP and user agent, the site's origin as
 * `Origin` (so ingest can flag localhost and preview hosts) and the admin session cookie alone (so
 * a signed-in admin's events are internal). Without either, no visitor details are sent, and the
 * `origin` from the call or the options stands in for the site. Events without a `visitor` or
 * `session` share the id in `serverVisitor`. `waitUntil` from the
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
  let pending: Outgoing[] = [];
  let scheduled: Promise<ServerResult> | null = null;

  function warn(error: ServerError) {
    if (warned.has(error.code)) return;
    warned.add(error.code);
    console.warn(`[ra] ${error.code}: ${error.message}`);
  }

  async function post(
    events: WireEvent[],
    from: Outgoing,
    secret: string,
    url: string,
  ): Promise<ServerResult> {
    const headers = new Headers({
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    });
    if (from.origin) headers.set("origin", from.origin);
    if (from.cookie) headers.set("cookie", from.cookie);
    try {
      const response = await request(url, {
        method: "POST",
        headers,
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

  async function send(batches: Outgoing[]): Promise<ServerResult> {
    const count = batches.reduce((sum, batch) => sum + batch.events.length, 0);
    if (!config.secret) return failed("RA_NO_SECRET", "secret is empty", count);
    if (!config.endpoint) return failed("RA_NO_ENDPOINT", "endpoint is empty", count);
    const url = eventsUrl(config.endpoint);
    let total = nothing;
    for (const batch of batches) {
      for (let start = 0; start < batch.events.length; start += maxEventsPerBatch) {
        const events = batch.events.slice(start, start + maxEventsPerBatch);
        const result = await post(events, batch, config.secret, url);
        const counts = {
          accepted: total.accepted + result.accepted,
          duplicates: total.duplicates + result.duplicates,
          failed: total.failed + result.failed,
        };
        total = total.ok ? { ...result, ...counts } : { ...total, ...counts };
      }
    }
    return total;
  }

  async function drain(): Promise<ServerResult> {
    const batches = pending;
    pending = [];
    if (batches.length === 0) return nothing;
    const result = await send(batches);
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
      visitor: from.visitor ?? serverVisitor,
      session: from.session ?? serverVisitor,
      page: { path: from.path ?? pathOf(from.request), route: null, title: null, referrer: null },
      props: limitProps({ ...tags, ...props }, name === "error").props,
      context: wire,
    });
    if (from.groups && hasKeys(from.groups)) event.groups = from.groups;
    return event;
  }

  function outgoing(from: RequestContext) {
    const headers = from.request?.headers ?? from.headers;
    const derived = headers ? siteOrigin(headers, from.request?.url) : null;
    const origin = from.origin ?? derived ?? config.origin ?? null;
    const cookie = headers ? adminSessionCookie(headers.get("cookie")) : null;
    return { origin, cookie };
  }

  function enqueue(event: WireEvent, from: RequestContext) {
    const { origin, cookie } = outgoing(from);
    const batch = pending.find((found) => found.origin === origin && found.cookie === cookie);
    if (batch) batch.events.push(event);
    else pending.push({ origin, cookie, events: [event] });
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
