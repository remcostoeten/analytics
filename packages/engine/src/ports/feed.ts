import type { Result } from "@spoar/shared/result";

import type { EngineError } from "../errors";
import type { ReadScope } from "./reads";

export type FeedCursor = { receivedAt: string; id: string };

export type LiveEvent = {
  id: string;
  projectId: string;
  name: string;
  ts: Date;
  path: string | null;
  country: string | null;
  device: string | null;
  visitorId: string | null;
  sessionId: string | null;
};

export type FeedPage = { events: LiveEvent[]; cursor: FeedCursor };

export type FeedQuery = {
  scope: Pick<ReadScope, "projectIds" | "traffic" | "environment" | "filters">;
  after: FeedCursor | null;
  limit: number;
};

export type RealtimeFeed = {
  next: (
    query: FeedQuery,
    wait: { ms: number; signal: AbortSignal | null },
  ) => Promise<Result<FeedPage, EngineError>>;
};
