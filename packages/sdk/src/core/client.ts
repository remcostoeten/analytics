import type { WireEvent } from "@spoar/contract";

import { pageviews } from "../plugins/pageviews";
import { beacon } from "../transports/beacon";
import { buildEvent, limitProps } from "./build-event";
import { browserConfig, mergeConfig } from "./config";
import {
  browserContext,
  browserStore,
  debugFlag,
  pageFacts,
  privacySignal,
  resolveMode,
} from "./environment";
import { createIdentity } from "./identity";
import { createLog } from "./logger";
import { createPluginHost } from "./plugin-host";
import { createQueue } from "./queue";
import { createSavedStore } from "./storage";
import type {
  Analytics,
  AnalyticsConfig,
  ConsentStatus,
  ErrorContext,
  EventMap,
  EventName,
  Handlers,
  Listener,
  Plugin,
  PluginClient,
  Props,
  PropsArgs,
} from "./types";
import { uuidv7 } from "./uuid";

type Registry = { [Name in Listener]: Set<Handlers[Name]> };

const maxSaved = 100;

function describe(error: unknown) {
  return error instanceof Error
    ? { type: error.name, message: error.message, stack: error.stack }
    : { type: "Error", message: String(error) };
}

/**
 * @name createAnalytics
 * @description Creates the browser client. It queues events in memory and sends them in batches,
 * keeps a visitor id in `localStorage` and a session in `sessionStorage`, honours consent,
 * opt-out, Do Not Track and Global Privacy Control, follows consent and opt-out changes made in
 * other tabs, and runs plugins, with `pageviews` on by default. Calls made before `start()` or,
 * with `consent: "required"`, before `consent.grant()` are held and replayed. In development mode
 * without an explicit `endpoint` it logs events instead of sending them. Options missing here are
 * read from the JSON in `NEXT_PUBLIC_RA_CONFIG`, `PUBLIC_RA_CONFIG` or `VITE_RA_CONFIG`.
 *
 * @example
 * const analytics = createAnalytics<Events>({ project: "remcostoeten.nl", key: "pk_test", endpoint: "/_ra" });
 * analytics.track("signup", { plan: "pro" });
 */
export function createAnalytics<Events extends EventMap = EventMap>(
  options: AnalyticsConfig = {},
): Analytics<Events> & { start: () => void } {
  const config = mergeConfig(browserConfig(), options);
  function now() {
    return Date.now();
  }
  const mode = resolveMode(config.mode ?? "auto");
  const endpoint = config.endpoint ?? "/_ra";
  const quiet = mode === "development" && !config.endpoint;
  const listeners: Registry = { error: new Set(), send: new Set(), drop: new Set() };
  const host = createPluginHost();
  const dnt = privacySignal(globalThis.navigator);
  const saved = createSavedStore(browserStore("localStorage"), allowed);
  const identity = createIdentity(saved, browserStore("sessionStorage"), now, allowed);
  const log = createLog(() => config.debug === true || saved.read().debug === true, console);
  let registered: Props = saved.read().props ?? {};
  let route: string | null = null;
  let started = false;
  let firstPage = true;
  let held: WireEvent[] = [];
  let lastError: string | null = null;
  let lastSend: string | null = null;
  const removers: (() => void)[] = [];

  const queue = createQueue({
    transport: config.transport ?? beacon({ endpoint, key: config.key ?? "" }),
    now,
    wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    schedule: (run, ms) => {
      const timer = setTimeout(run, ms);
      return () => clearTimeout(timer);
    },
    onSend: (envelope, result) => {
      lastSend = new Date(now()).toISOString();
      for (const item of result.rejected) {
        report("RA_INGEST_REJECTED", `${item.code}: ${item.message}`, envelope.events[item.index]);
      }
      for (const handler of listeners.send) handler(envelope);
    },
    onFailure: (_, status) => {
      lastError = `HTTP ${status}`;
      report("RA_INGEST_FAILED", lastError);
    },
    persist: (events) => {
      saved.write({ queue: [...(saved.read().queue ?? []), ...events].slice(-maxSaved) });
    },
  });

  function report(code: string, detail: string, event?: WireEvent) {
    log.info(code, detail, event);
    for (const handler of listeners.error) handler(code, detail);
  }

  function consentStatus(): ConsentStatus {
    return saved.read().consent ?? "unset";
  }

  function optedOut() {
    return saved.read().optOut === true;
  }

  function blocked() {
    return optedOut() ? "opt-out" : dnt ? "dnt" : null;
  }

  function allowed() {
    if (blocked()) return false;
    const status = consentStatus();
    return config.consent === "required" ? status === "granted" : status !== "denied";
  }

  function waiting() {
    return !started || (config.consent === "required" && consentStatus() === "unset");
  }

  function drop(event: WireEvent, reason: string) {
    log.info("RA_DROP", `${event.name}: ${reason}`);
    for (const handler of listeners.drop) handler(event, reason);
  }

  function deliver(event: WireEvent) {
    if (!allowed()) return drop(event, blocked() ?? "consent");
    log.info(quiet ? "RA_DEV_EVENT" : "RA_EVENT", event.name, event);
    if (!quiet) queue.add(event);
  }

  function send(
    name: string,
    props: { [key: string]: unknown },
    tags: Props,
    path: string | null = null,
  ) {
    const limited = limitProps({ ...registered, ...tags, ...props }, name === "error");
    if (mode === "development") {
      if (limited.problems.length > 0) {
        log.warn("RA_PROPS_LIMITED", `${name}: left out or cut ${limited.problems.join(", ")}`);
      }
    }
    const page = pageFacts(route, name === "pageview" && firstPage);
    if (path) page.path = path;
    if (name === "pageview") firstPage = false;
    const event = buildEvent({
      id: uuidv7(now()),
      name,
      ts: new Date(now()).toISOString(),
      visitor: identity.visitor(),
      session: identity.session(),
      page,
      props: limited.props,
      context: browserContext(config.release),
    });
    const reason = blocked();
    if (reason) return drop(event, reason);
    const kept = host.apply(event);
    const final = kept && config.beforeSend ? config.beforeSend(kept) : kept;
    if (!final) return drop(event, "beforeSend");
    if (waiting()) {
      held.push(final);
      return;
    }
    deliver(final);
  }

  function release() {
    if (waiting()) return;
    const events = held;
    held = [];
    for (const event of events) deliver(event);
  }

  function capture(
    message: string,
    fallback: "error" | "warning",
    context: ErrorContext,
    tags: Props,
    extra: Props,
  ) {
    send(
      "error",
      {
        ...context.tags,
        ...extra,
        message,
        level: context.level ?? fallback,
        ...(context.fingerprint ? { fingerprint: context.fingerprint } : {}),
      },
      tags,
    );
  }

  function forgetIdentity() {
    identity.reset();
    registered = {};
    saved.drop(["userId", "traits", "props", "queue"]);
  }

  function methods<Map extends EventMap>(tags: Props): Analytics<Map> {
    function track<Name extends EventName<Map>>(name: Name, ...args: PropsArgs<Map, Name>) {
      send(name, args[0] ?? {}, tags);
    }

    return {
      track,
      page: (props) => {
        send("pageview", props ?? {}, tags);
        host.page();
      },
      identify: (userId, traits) => {
        saved.write({ userId, traits: { ...saved.read().traits, ...traits } });
        send("identify", { ...traits, userId }, tags);
      },
      register: (props) => {
        registered = { ...registered, ...props };
        saved.write({ props: registered });
      },
      captureError: (error, context = {}) => {
        const { type, message, stack } = describe(error);
        capture(message, "error", context, tags, { type, ...(stack ? { stack } : {}) });
      },
      captureMessage: (message, context = {}) => capture(message, "warning", context, tags, {}),
      scope: (more) => methods<Map>({ ...tags, ...more }),
      use: (plugin) => host.use(plugin, pluginClient),
      consent,
      optOut: () => {
        saved.write({ optOut: true }, true);
        held = [];
        queue.clear();
      },
      optIn: () => saved.write({ optOut: false }, true),
      isOptedOut: optedOut,
      reset: () => {
        forgetIdentity();
        firstPage = true;
        route = null;
      },
      flush: () => queue.flush(),
      shutdown: async () => {
        await queue.flush();
        host.stop();
        for (const remove of removers.splice(0)) remove();
        for (const set of Object.values(listeners)) set.clear();
      },
      on: (name, handler) => {
        const set = listeners[name] as Set<typeof handler>;
        set.add(handler);
        return () => set.delete(handler);
      },
      status: () => ({
        queued: queue.size() + held.length,
        consent: consentStatus(),
        endpoint,
        route,
        lastError,
        lastSend,
      }),
      route: (template) => {
        route = template;
      },
    };
  }

  const consent = {
    grant: () => {
      saved.write({ consent: "granted" }, true);
      host.consent("granted");
      release();
    },
    revoke: () => {
      held = [];
      queue.clear();
      forgetIdentity();
      saved.write({ consent: "denied" }, true);
      host.consent("denied");
    },
    status: consentStatus,
  } as const;

  const client = methods<Events>({});
  const pluginClient: PluginClient = {
    ...methods<EventMap>({}),
    beforeSend: host.beforeSend,
    onPage: host.onPage,
    onHidden: host.onHidden,
    onConsent: host.onConsent,
    record: (path, name, props) => send(name, props, {}, path),
  };

  function hidden() {
    host.hidden();
    void queue.flush(true);
  }

  function start() {
    if (started) return;
    started = true;
    const flag = debugFlag();
    saved.write(flag === null ? {} : { debug: flag }, flag !== null);
    const leftover = saved.read().queue ?? [];
    if (leftover.length > 0 && allowed()) {
      saved.drop(["queue"]);
      for (const event of leftover) queue.add(event);
    }
    const plugins: Plugin[] = [
      ...(config.plugins ?? []),
      ...(config.pageviews === false ? [] : [pageviews()]),
    ];
    for (const plugin of plugins) removers.push(host.use(plugin, pluginClient));
    if (typeof document !== "undefined") {
      function onVisibility() {
        if (document.visibilityState === "hidden") hidden();
      }
      function onStorage() {
        saved.refresh();
        if (!allowed()) queue.clear();
        release();
      }
      document.addEventListener("visibilitychange", onVisibility);
      addEventListener("pagehide", hidden);
      addEventListener("storage", onStorage);
      removers.push(() => {
        document.removeEventListener("visibilitychange", onVisibility);
        removeEventListener("pagehide", hidden);
        removeEventListener("storage", onStorage);
      });
    }
    if (!config.key) log.warn("RA_NO_KEY", "key is empty");
    release();
  }

  if (config.autostart ?? typeof window !== "undefined") start();
  return { ...client, start };
}
