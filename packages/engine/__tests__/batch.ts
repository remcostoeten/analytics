import { readFileSync } from "node:fs";
import { join } from "node:path";

import { IngestEnvelope } from "@remcostoeten/analytics-contract";
import { Value } from "@sinclair/typebox/value";

import {
  fixedClock,
  memoryGeo,
  memoryHasher,
  memoryLimiter,
  memoryLogger,
  memoryStore,
} from "../src/adapters/memory";
import type { IngestBatch } from "../src/draft";

const fixture = join(
  import.meta.dir,
  "../../contract/fixtures/IngestEnvelope/valid/browser-batch.json",
);

export const now = new Date("2026-09-27T16:40:00.620Z");

export function browserBatch(): IngestBatch {
  const envelope: unknown = JSON.parse(readFileSync(fixture, "utf8"));
  if (!Value.Check(IngestEnvelope, envelope)) throw new Error("browser-batch fixture is invalid");
  return {
    projectId: "remcostoeten.nl",
    receivedAt: now.toISOString(),
    sentAt: envelope.sentAt,
    request: {
      ip: "81.2.69.160",
      userAgent: "Mozilla/5.0 Firefox/143",
      origin: "https://remcostoeten.nl",
    },
    events: envelope.events,
  };
}

export function memoryPorts() {
  const clock = fixedClock(now);
  return {
    store: memoryStore(),
    geo: memoryGeo(new Map()),
    limiter: memoryLimiter(clock),
    hasher: memoryHasher(),
    clock,
    logger: memoryLogger(),
  };
}
