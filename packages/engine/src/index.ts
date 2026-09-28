export { authorize } from "./authorize";
export type { Authorized } from "./authorize";
export { dedupeBatch } from "./dedupe";
export type { Deduped } from "./dedupe";
export { defineDimension, defineEnricher, defineSignal, defineStage } from "./define";
export type {
  Dimension,
  DimensionJoin,
  DimensionScope,
  Enricher,
  Registry,
  Settings,
  Signal,
  Stage,
  StageContext,
  StageResult,
} from "./define";
export { correctedTimestamp, createDraft } from "./draft";
export type {
  BatchContext,
  Client,
  Credentials,
  Enrichment,
  EventDraft,
  Flags,
  IngestRequest,
  Network,
  RequestFacts,
} from "./draft";
export { defaultEnrichers, forwardedHeaders } from "./enrichers";
export { defaultDimensions, findDimension, propDimension, traitDimension } from "./dimensions";
export { defaultSignals } from "./signals";
export { engineError } from "./errors";
export type { EngineError } from "./errors";
export { createEngine } from "./pipeline";
export type { Engine } from "./pipeline";
export type * from "./ports";
export { defaultStages } from "./stages";
export { botScoreStage, scoreBot } from "./stages/bot-score";
export { enrichStage } from "./stages/enrich";
export { flagsStage } from "./stages/flags";
export { parseEvent } from "./stages/parse";
export { clientIp } from "./utilities/client-ip";
export type { HeaderBag } from "./utilities/client-ip";
export { hashIp, ipSecretProblem } from "./utilities/ip-hash";
export { prepareQuery } from "./query/guard";
export type { PreparedQuery, QueryParams } from "./query/guard";
export { queryViews } from "./query/views";
export type { QueryView, ViewColumn } from "./query/views";
export {
  experienceScore,
  metricScore,
  scoreRating,
  vitalRating,
  vitalThresholds,
} from "./speed/score";
export type { VitalName, VitalRating } from "./speed/score";
