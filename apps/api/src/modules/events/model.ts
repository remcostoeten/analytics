import { IngestResult, Timestamp } from "@spoar/contract";
import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const IngestBody = Type.Object(
  {
    v: Type.Literal(1),
    sentAt: Timestamp,
    events: Type.Array(Type.Unknown(), { minItems: 1 }),
  },
  { description: "Each event is a WireEvent, checked on its own and rejected by index." },
);
export type IngestBody = Static<typeof IngestBody>;

export const ingestResponses = {
  202: IngestResult,
  400: "ApiError",
  401: "ApiError",
  403: "ApiError",
  413: "ApiError",
  429: "ApiError",
  500: "ApiError",
  503: "ApiError",
} as const;
