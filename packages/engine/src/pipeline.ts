import type { IngestResult, RejectedEvent } from "@remcostoeten/analytics-contract";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";

import type { Registry, Stage, StageContext, StageResult } from "./define";
import { createDraft } from "./draft";
import type { EventDraft, IngestBatch } from "./draft";
import { engineError } from "./errors";
import type { EngineError } from "./errors";
import type { Ports } from "./ports";

export type Engine = {
  ingest: (batch: IngestBatch) => Promise<Result<IngestResult, EngineError>>;
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
 * @description Builds the ingest engine from its ports and registries. `ingest` runs every event
 * of a batch through the stages in order; the first failing stage rejects that event by index,
 * a throwing stage becomes `INTERNAL` with its stack logged, and the accepted events are stored
 * in one call. `rescore` reruns only the stages marked `rescores` over stored drafts.
 *
 * @example
 * const engine = createEngine(ports, { stages: [enrichStage, botScoreStage], signals, enrichers, dimensions });
 * const result = await engine.ingest(batch);
 */
export function createEngine(ports: Ports, registry: Registry): Engine {
  const context: StageContext = { ports, registry };
  const rescoreStages = registry.stages.filter((stage) => stage.rescores);

  async function ingest(batch: IngestBatch): Promise<Result<IngestResult, EngineError>> {
    const results = await Promise.all(
      batch.events.map((event, index) =>
        runStages(registry.stages, createDraft(batch, event, index), context),
      ),
    );
    const accepted: EventDraft[] = [];
    const rejected: RejectedEvent[] = [];
    for (const [index, result] of results.entries()) {
      if (result.ok) accepted.push(result.value);
      else rejected.push(rejection(index, result.error));
    }
    if (accepted.length === 0) return ok({ accepted: 0, duplicates: 0, rejected });
    const stored = await ports.store.insertEvents(accepted);
    if (!stored.ok) return stored;
    return ok({
      accepted: stored.value.inserted.length,
      duplicates: stored.value.duplicates.length,
      rejected,
    });
  }

  async function rescore(drafts: EventDraft[]) {
    return Promise.all(drafts.map((draft) => runStages(rescoreStages, draft, context)));
  }

  return { ingest, rescore };
}
