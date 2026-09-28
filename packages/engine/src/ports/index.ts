import type { Clock } from "./clock";
import type { EventStore } from "./event-store";
import type { GeoLookup } from "./geo-lookup";
import type { Hasher } from "./hasher";
import type { Logger } from "./logger";
import type { ProjectStore } from "./project-store";
import type { RateLimiter } from "./rate-limiter";

export type { Clock } from "./clock";
export type { EventStore, InsertOutcome } from "./event-store";
export type { GeoLookup, GeoRecord, Location } from "./geo-lookup";
export type { Hasher } from "./hasher";
export type { LogEntry, LogFields, Logger, LogLevel } from "./logger";
export type { ProjectAccess, ProjectStore } from "./project-store";
export type { RateDecision, RateLimiter } from "./rate-limiter";

export type Ports = {
  store: EventStore;
  projects: ProjectStore;
  geo: GeoLookup;
  limiter: RateLimiter;
  hasher: Hasher;
  clock: Clock;
  logger: Logger;
};
