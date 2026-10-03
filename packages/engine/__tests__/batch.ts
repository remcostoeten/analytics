import { readFileSync } from "node:fs";
import { join } from "node:path";

import { IngestEnvelope } from "@spoar/contract";
import { Value } from "@sinclair/typebox/value";

import {
  fixedClock,
  memoryGeo,
  memoryHasher,
  memoryLimiter,
  memoryLogger,
  memoryProjects,
  memoryStore,
} from "../src/adapters/memory";
import type { MemoryProject } from "../src/adapters/memory";
import type { Settings } from "../src/define";
import type { BatchContext, IngestRequest } from "../src/draft";

const fixture = join(
  import.meta.dir,
  "../../contract/fixtures/IngestEnvelope/valid/browser-batch.json",
);

export const now = new Date("2026-09-27T16:40:00.620Z");

export const settings: Settings = {
  ipSecret: "test-secret-that-is-at-least-32-characters",
  rateLimit: { limit: 100, windowSeconds: 60 },
};

export const testKey = "sk_test";

export const project: MemoryProject = {
  id: "remcostoeten.nl",
  publicKey: "pk_live_3f9c2a7d",
  secretHash: `sha256(${testKey})`,
  allowedOrigins: ["https://remcostoeten.nl"],
};

function envelope() {
  const parsed: unknown = JSON.parse(readFileSync(fixture, "utf8"));
  if (!Value.Check(IngestEnvelope, parsed)) throw new Error("browser-batch fixture is invalid");
  return parsed;
}

export function browserRequest(headers: { [name: string]: string } = {}): IngestRequest {
  const { sentAt, events } = envelope();
  return {
    credentials: { publicKey: project.publicKey, secretKey: null },
    receivedAt: now.toISOString(),
    sentAt,
    request: {
      headers: new Headers({
        origin: "https://remcostoeten.nl",
        "user-agent": "Mozilla/5.0 Firefox/143",
        "x-forwarded-for": "81.2.69.160",
        ...headers,
      }),
      adminSession: false,
    },
    events,
  };
}

export function batchContext(): BatchContext {
  const request = browserRequest();
  return {
    projectId: project.id,
    trusted: false,
    receivedAt: request.receivedAt,
    sentAt: request.sentAt,
    request: request.request,
  };
}

export function browserEvents() {
  return envelope().events;
}

export function memoryPorts() {
  const clock = fixedClock(now);
  return {
    store: memoryStore(),
    projects: memoryProjects([project]),
    geo: memoryGeo(new Map()),
    limiter: memoryLimiter(clock),
    hasher: memoryHasher(),
    clock,
    logger: memoryLogger(),
  };
}
