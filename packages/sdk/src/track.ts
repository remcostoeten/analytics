import { getVisitorId } from "./visitor-id";
import { getSessionId, extendSession } from "./session-id";
import { isOptedOut, checkDoNotTrack } from "./opt-out";
import { collectEnrichment } from "./enrich";

type EventType = "pageview" | "event" | "click" | "error";

export type AnalyticsOptions = {
  projectId?: string;
  ingestUrl?: string;
  debug?: boolean;
};

type EventPayload = {
  type: EventType;
  projectId: string;
  path: string;
  referrer: string | null;
  origin: string;
  host: string;
  ua: string;
  lang: string;
  visitorId: string;
  sessionId: string;
  meta?: Record<string, unknown>;
};

const recentEvents = new Set<string>();
const DEDUPE_WINDOW_MS = 5000;

function getDefaultProjectId(): string {
  if (typeof window === "undefined") {
    return "unknown";
  }
  return window.location.hostname;
}

function getDefaultIngestUrl(): string {
  if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_REMCO_ANALYTICS_URL) {
    return process.env.NEXT_PUBLIC_REMCO_ANALYTICS_URL;
  }
  return "http://localhost:3001";
}

function createEventKey(payload: EventPayload): string {
  return `${payload.type}-${payload.path}-${payload.visitorId}-${payload.sessionId}`;
}

function isDuplicate(payload: EventPayload): boolean {
  const key = createEventKey(payload);
  if (recentEvents.has(key)) {
    return true;
  }
  recentEvents.add(key);
  setTimeout(() => recentEvents.delete(key), DEDUPE_WINDOW_MS);
  return false;
}

function buildPayload(
  type: EventType,
  meta: Record<string, unknown> | undefined,
  options: TrackOptions
): EventPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  const projectId = options.projectId || getDefaultProjectId();
  const visitorId = getVisitorId();
  const sessionId = getSessionId();

  return {
    type,
    projectId,
    path: window.location.pathname,
    referrer: document.referrer || null,
    origin: window.location.origin,
    host: window.location.host,
    ua: navigator.userAgent,
    lang: navigator.language,
    visitorId,
    sessionId,
    meta: {
      ...collectEnrichment(),
      ...meta,
    },
  };
}

function sendWithBeacon(url: string, payload: EventPayload): boolean {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) {
    return false;
  }

  try {
    const blob = new Blob([JSON.stringify(payload)], {
      type: "application/json",
    });
    return navigator.sendBeacon(url, blob);
  } catch {
    return false;
  }
}

function sendWithFetch(url: string, payload: EventPayload): void {
  if (typeof fetch === "undefined") {
    return;
  }

  try {
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      // Silent fail
    });
  } catch {
    // Silent fail
  }
}

export function track(
  type: EventType,
  meta?: Record<string, unknown>,
  options: AnalyticsOptions = {}
): void {
  if (isOptedOut()) {
    if (options.debug) {
      console.log("[Analytics] User has opted out");
    }
    return;
  }

  if (checkDoNotTrack()) {
    if (options.debug) {
      console.log("[Analytics] Do Not Track is enabled");
    }
    return;
  }

  const payload = buildPayload(type, meta, options);
  if (!payload) {
    if (options.debug) {
      console.log("[Analytics] SSR detected, skipping track");
    }
    return;
  }

  if (isDuplicate(payload)) {
    if (options.debug) {
      console.log("[Analytics] Duplicate event blocked", payload);
    }
    return;
  }

  const ingestUrl = options.ingestUrl || getDefaultIngestUrl();
  const endpoint = `${ingestUrl}/ingest`;

  extendSession();

  const beaconSent = sendWithBeacon(endpoint, payload);

  if (!beaconSent) {
    sendWithFetch(endpoint, payload);
  }

  if (options.debug) {
    console.log("[Analytics] Event tracked", payload);
  }
}

export function trackPageView(
  meta?: Record<string, unknown>,
  options?: AnalyticsOptions
): void {
  track("pageview", meta, options);
}

export function trackEvent(
  eventName: string,
  meta?: Record<string, unknown>,
  options?: AnalyticsOptions
): void {
  track("event", { eventName, ...meta }, options);
}

export function trackClick(
  elementName: string,
  meta?: Record<string, unknown>,
  options?: AnalyticsOptions
): void {
  track("click", { elementName, ...meta }, options);
}

export function trackError(
  error: Error,
  meta?: Record<string, unknown>,
  options?: AnalyticsOptions
): void {
  track("error", {
    message: error.message,
    stack: error.stack,
    ...meta,
  }, options);
}

// -----------------------------------------------------------------------------
// Advanced Analytics Strongly-Typed Helpers
// -----------------------------------------------------------------------------

export function trackTransaction(
  revenue: number,
  currency: string = "USD",
  orderId?: string,
  items?: number,
  options?: AnalyticsOptions
): void {
  track("event", {
    eventName: "transaction",
    revenue,
    currency,
    orderId,
    items,
  }, options);
}

export function trackSearch(
  query: string,
  resultCount: number,
  options?: AnalyticsOptions
): void {
  track("event", {
    eventName: "site_search",
    query,
    resultCount,
  }, options);
}

export function identifyUser(
  userProperties: Record<string, string | number | boolean>,
  options?: AnalyticsOptions
): void {
  track("event", {
    eventName: "identify",
    userProperties,
  }, options);
}

export function setExperiment(
  experimentId: string,
  variantId: string,
  options?: AnalyticsOptions
): void {
  track("event", {
    eventName: "experiment_exposure",
    experiments: {
      [experimentId]: variantId
    }
  }, options);
}

