import { ok } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

import type { EventDraft } from "../draft";
import type {
  Clock,
  EventStore,
  ProjectAccess,
  ProjectStore,
  GeoLookup,
  GeoRecord,
  Hasher,
  LogEntry,
  Logger,
  RateLimiter,
} from "../ports";
import type { LogFields, LogLevel } from "../ports/logger";

export { memoryAlerts } from "./memory-alerts";
export { memoryLogs } from "./memory-logs";

export const emptyRecord: GeoRecord = {
  geo: {
    country: null,
    region: null,
    city: null,
    postalCode: null,
    timezone: null,
    latitude: null,
    longitude: null,
    continent: null,
  },
  network: { asn: null, asOrg: null },
};

/**
 * @name memoryStore
 * @description An `EventStore` held in a map keyed by event id, which reports repeated ids as
 * duplicates the way the database's unique index does, and keeps each session's drafts. A
 * visitor seen internal once stays internal, and its later events are stored as internal.
 *
 * @example
 * const store = memoryStore();
 * await store.insertEvents(drafts);
 * store.events.size; // number of stored events
 */
export function memoryStore(): EventStore & {
  events: Map<string, EventDraft>;
  sessions: Map<string, EventDraft[]>;
} {
  const events = new Map<string, EventDraft>();
  const sessions = new Map<string, EventDraft[]>();
  const internalVisitors = new Set<string>();
  return {
    events,
    sessions,
    upsertSessions: async (drafts) => {
      for (const draft of drafts) {
        if (draft.flags.internal) internalVisitors.add(`${draft.projectId}:${draft.event.visitor}`);
      }
      for (const draft of drafts) {
        const internal = internalVisitors.has(`${draft.projectId}:${draft.event.visitor}`);
        const stored = internal ? { ...draft, flags: { ...draft.flags, internal } } : draft;
        events.set(draft.event.id, stored);
        const key = `${draft.projectId}:${draft.event.session}`;
        sessions.set(key, [...(sessions.get(key) ?? []), stored]);
      }
      return ok(undefined);
    },
    insertEvents: async (drafts) => {
      const inserted: string[] = [];
      const duplicates: string[] = [];
      for (const draft of drafts) {
        if (events.has(draft.event.id)) {
          duplicates.push(draft.event.id);
        } else {
          events.set(draft.event.id, draft);
          inserted.push(draft.event.id);
        }
      }
      return ok({ inserted, duplicates });
    },
  };
}

/**
 * @name memoryGeo
 * @description A `GeoLookup` that answers from a fixed map of IP addresses and returns an empty
 * record for anything else.
 *
 * @example
 * const geo = memoryGeo(new Map([["81.2.69.160", record]]));
 */
export function memoryGeo(records: Map<string, GeoRecord>): GeoLookup {
  return { lookup: (ip) => records.get(ip) ?? emptyRecord };
}

/**
 * @name fixedClock
 * @description A `Clock` that always returns the same instant, for deterministic tests.
 *
 * @example
 * const clock = fixedClock(new Date("2026-09-27T16:40:00.000Z"));
 */
export function fixedClock(now: Date): Clock {
  return { now: () => new Date(now) };
}

/**
 * @name memoryLimiter
 * @description A fixed-window `RateLimiter` counted in memory against the given clock.
 *
 * @example
 * const limiter = memoryLimiter(fixedClock(new Date()));
 * await limiter.hit("ip:abc", 60, 60);
 */
export function memoryLimiter(clock: Clock): RateLimiter {
  const windows = new Map<string, number>();
  return {
    hit: async (key, limit, windowSeconds) => {
      const windowMs = windowSeconds * 1000;
      const start = Math.floor(clock.now().getTime() / windowMs) * windowMs;
      const slot = `${key}@${start}`;
      const hits = (windows.get(slot) ?? 0) + 1;
      windows.set(slot, hits);
      const retryAfterSeconds = Math.ceil((start + windowMs - clock.now().getTime()) / 1000);
      return {
        allowed: hits <= limit,
        hits,
        retryAfterSeconds: hits <= limit ? 0 : retryAfterSeconds,
      };
    },
  };
}

/**
 * @name memoryHasher
 * @description A `Hasher` that returns a readable fake digest, so tests can assert on it.
 *
 * @example
 * await memoryHasher().sha256("abc"); // "sha256(abc)"
 */
export function memoryHasher(): Hasher {
  return { sha256: async (input) => `sha256(${input})` };
}

/**
 * @name memoryLogger
 * @description A `Logger` that collects entries in an array instead of writing them.
 *
 * @example
 * const logger = memoryLogger();
 * logger.error("stage threw", { stage: "enrich" });
 * logger.entries[0]?.level; // "error"
 */
export function memoryLogger(): Logger & { entries: LogEntry[] } {
  const entries: LogEntry[] = [];
  function log(level: LogLevel) {
    return (message: string, fields: LogFields = {}) => {
      entries.push({ level, message, fields });
    };
  }
  return {
    entries,
    debug: log("debug"),
    info: log("info"),
    warn: log("warn"),
    error: log("error"),
  };
}

export type MemoryProject = Omit<ProjectAccess, "widgetReports"> & {
  publicKey: string;
  secretHash: string;
  widgetReports?: boolean;
};

/**
 * @name memoryProjects
 * @description A `ProjectStore` over a fixed list of projects.
 *
 * @example
 * const projects = memoryProjects([{ id: "demo", publicKey: "pk_demo", secretHash: "sha256(sk_demo)", allowedOrigins: [] }]);
 */
export function memoryProjects(list: MemoryProject[]): ProjectStore {
  function access(project: MemoryProject | undefined): Nullable<ProjectAccess> {
    return project
      ? {
          id: project.id,
          allowedOrigins: project.allowedOrigins,
          widgetReports: project.widgetReports ?? false,
        }
      : null;
  }
  return {
    byPublicKey: async (key) => ok(access(list.find((project) => project.publicKey === key))),
    bySecretHash: async (hash) => ok(access(list.find((project) => project.secretHash === hash))),
  };
}
