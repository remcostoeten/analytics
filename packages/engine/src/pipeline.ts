import type { IngestResult, RejectedEvent } from "@remcostoeten/analytics-contract";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";

import { authorize } from "./authorize";
import type { Authorized } from "./authorize";
import { dedupeBatch } from "./dedupe";
import type { Registry, Settings, Stage, StageContext, StageResult } from "./define";
import { createDraft } from "./draft";
import type { EventDraft, IngestRequest } from "./draft";
import { engineError } from "./errors";
import type { EngineError } from "./errors";
import type { Ports } from "./ports";
import { parseEvent } from "./stages/parse";
import { clientIp } from "./utilities/client-ip";
import { hashIp } from "./utilities/ip-hash";

export type Engine = {
  ingest: (request: IngestRequest) => Promise<Result<IngestResult, EngineError>>;
  rescore: (drafts: EventDraft[]) => Promise<StageResult[]>;
};

function describe(error: unknown) {
  return error instanceof Error ? (error.stack ?? error.message) : String(error);
}

async function runStage(
  stage: Stage,
  draft: EventDraft,
  context: StageContext,
): Promise<StageResult> {
  try {
    return await stage.run(draft, context);
  } catch (error) {
    context.ports.logger.error("stage threw", {
      stage: stage.name,
      index: draft.index,
      project: draft.projectId,
      stack: describe(error),
    });
    return err(engineError("INTERNAL", "Internal error"));
  }
}

async function runStages(stages: Stage[], draft: EventDraft, context: StageContext) {
  let current: StageResult = ok(draft);
  for (const stage of stages) {
    if (!current.ok) return current;
    current = await runStage(stage, current.value, context);
  }
  return current;
}

function rejection(index: number, error: EngineError): RejectedEvent {
  return { index, code: error.code, message: error.message };
}

/**
 * @name createEngine
 * @description Builds the ingest engine from its ports, registries and settings. `ingest`
 * authorizes the batch, rate-limits untrusted callers per IP hash, parses each event, runs it
 * through the stages in order, drops repeated ids, stores the batch in one insert and upserts
 * sessions and visitors. The first failing stage rejects that event by index; a throwing stage
 * becomes `INTERNAL` with its stack logged. `rescore` reruns only the stages marked `rescores`.
 *
 * @example
 * const engine = createEngine(ports, { stages: defaultStages, signals, enrichers: defaultEnrichers, dimensions }, settings);
 * const result = await engine.ingest(request);
 */
export function createEngine(ports: Ports, registry: Registry, settings: Settings): Engine {
  const context: StageContext = { ports, registry, settings };
  const rescoreStages = registry.stages.filter((stage) => stage.rescores);

  async function admit(request: IngestRequest): Promise<Result<Authorized, EngineError>> {
    const { headers } = request.request;
    const access = await authorize(
      ports.projects,
      ports.hasher,
      request.credentials,
      headers.get("origin"),
    );
    if (!access.ok || access.value.trusted) return access;
    const caller = await hashIp(
      ports.hasher,
      settings.ipSecret,
      clientIp(headers),
      request.receivedAt,
    );
    const { limit, windowSeconds } = settings.rateLimit;
    const decision = await ports.limiter.hit(
      `ingest:${access.value.projectId}:${caller ?? "unknown"}`,
      limit,
      windowSeconds,
    );
    if (decision.allowed) return access;
    return err({
      ...engineError("RATE_LIMITED", "Too many requests"),
      details: { retryAfterSeconds: decision.retryAfterSeconds },
    });
  }

  async function storeSessions(drafts: EventDraft[]) {
    const sessions = await ports.store.upsertSessions(drafts);
    if (!sessions.ok) {
      ports.logger.error("session upsert failed", {
        project: drafts[0]?.projectId ?? null,
        message: sessions.error.message,
      });
    }
  }

  async function ingest(request: IngestRequest): Promise<Result<IngestResult, EngineError>> {
    const access = await admit(request);
    if (!access.ok) return access;
    const batch = { ...access.value, ...request };
    const results = await Promise.all(
      request.events.map(async (raw, index) => {
        const parsed = parseEvent(raw, index);
        if (!parsed.ok) return parsed;
        return runStages(registry.stages, createDraft(batch, parsed.value, index), context);
      }),
    );
    const accepted: EventDraft[] = [];
    const rejected: RejectedEvent[] = [];
    for (const [index, result] of results.entries()) {
      if (result.ok) accepted.push(result.value);
      else rejected.push(rejection(index, result.error));
    }
    const { unique, repeated } = dedupeBatch(accepted);
    if (unique.length === 0) return ok({ accepted: 0, duplicates: repeated, rejected });
    const stored = await ports.store.insertEvents(unique);
    if (!stored.ok) return stored;
    const inserted = new Set(stored.value.inserted);
    const fresh = unique.filter((draft) => inserted.has(draft.event.id));
    if (fresh.length > 0) await storeSessions(fresh);
    return ok({
      accepted: stored.value.inserted.length,
      duplicates: stored.value.duplicates.length + repeated,
      rejected,
    });
  }

  async function rescore(drafts: EventDraft[]) {
    return Promise.all(drafts.map((draft) => runStages(rescoreStages, draft, context)));
  }

  return { ingest, rescore };
}
