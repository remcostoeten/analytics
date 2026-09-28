import type { BotReason } from "@remcostoeten/analytics-contract";
import type { Result } from "@remcostoeten/analytics-shared/result";

import type { Enrichment, EventDraft } from "./draft";
import type { EngineError } from "./errors";
import type { Ports } from "./ports";

export type StageContext = {
  ports: Ports;
  registry: Registry;
};

export type StageResult = Result<EventDraft, EngineError>;

export type Stage = {
  name: string;
  rescores: boolean;
  run: (draft: EventDraft, context: StageContext) => StageResult | Promise<StageResult>;
};

export type Signal = {
  name: BotReason;
  weight: number;
  detect: (draft: EventDraft) => boolean;
};

export type Enricher = {
  name: string;
  enrich: (draft: EventDraft, ports: Ports) => Partial<Enrichment> | Promise<Partial<Enrichment>>;
};

export type Dimension = {
  name: string;
  label: string;
  column: string;
};

export type Registry = {
  stages: Stage[];
  signals: Signal[];
  enrichers: Enricher[];
  dimensions: Dimension[];
};

/**
 * @name defineStage
 * @description Declares a pipeline stage: a function from a draft to a refined draft or an
 * `EngineError`. `rescores` marks the stages `engine.rescore` reruns over stored events.
 *
 * @example
 * const flags = defineStage({ name: "flags", rescores: false, run: (draft) => ok(draft) });
 */
export function defineStage(stage: Stage): Stage {
  return stage;
}

/**
 * @name defineSignal
 * @description Declares a bot signal: a named, weighted check the bot score stage sums.
 *
 * @example
 * const webdriver = defineSignal({ name: "client_webdriver", weight: 60, detect: (draft) => (draft.event.signals ?? 0) > 0 });
 */
export function defineSignal(signal: Signal): Signal {
  return signal;
}

/**
 * @name defineEnricher
 * @description Declares an enricher: it reads the draft and ports and returns the enrichment
 * fields it fills, which the enrich stage merges in registration order.
 *
 * @example
 * const geo = defineEnricher({ name: "geo", enrich: (draft, ports) => ({ geo: ports.geo.lookup(draft.request.ip ?? "").geo }) });
 */
export function defineEnricher(enricher: Enricher): Enricher {
  return enricher;
}

/**
 * @name defineDimension
 * @description Declares a report dimension: the name the breakdown and filter routes accept and
 * the column it reads.
 *
 * @example
 * const page = defineDimension({ name: "page", label: "Page", column: "path" });
 */
export function defineDimension(dimension: Dimension): Dimension {
  return dimension;
}
