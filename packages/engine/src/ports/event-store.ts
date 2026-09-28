import type { Result } from "@remcostoeten/analytics-shared/result";
import type { EventID } from "@remcostoeten/analytics-shared/semantic";

import type { EventDraft } from "../draft";
import type { EngineError } from "../errors";

export type InsertOutcome = {
  inserted: EventID[];
  duplicates: EventID[];
};

export type EventStore = {
  insertEvents: (drafts: EventDraft[]) => Promise<Result<InsertOutcome, EngineError>>;
  upsertSessions: (drafts: EventDraft[]) => Promise<Result<void, EngineError>>;
};
