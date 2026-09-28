import type {
  EventRow,
  Person,
  PersonRow,
  SessionEvents,
  SessionRow,
  Visit,
  VisitorDetail,
  VisitorRow,
} from "@remcostoeten/analytics-contract";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type {
  Nullable,
  ProjectID,
  SessionID,
  VisitorID,
} from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";
import type { ReadScope } from "./reads";

export type Keyset = { ts: string; id: string };
export type Offset = { limit: number; offset: number };

export type Page<Row> = { rows: Row[]; next: Nullable<Keyset>; total: Nullable<number> };

export type MarkedVisitor = { eventsUpdated: number; sessionsUpdated: number };

type Detail<Value> = Promise<Result<Value, EngineError>>;

export type DetailStore = {
  events: (
    scope: ReadScope,
    name: Nullable<string>,
    limit: number,
    after: Nullable<Keyset>,
  ) => Detail<Page<EventRow>>;
  visitors: (scope: ReadScope, page: Offset) => Detail<Page<VisitorRow>>;
  visitor: (
    project: ProjectID,
    visitor: VisitorID,
    now: Date,
  ) => Detail<Nullable<VisitorDetail["data"]>>;
  markVisitor: (
    project: ProjectID,
    visitor: VisitorID,
    internal: boolean,
  ) => Detail<Nullable<MarkedVisitor>>;
  sessions: (scope: ReadScope, page: Offset) => Detail<Page<SessionRow>>;
  sessionEvents: (
    project: ProjectID,
    session: SessionID,
    limit: number,
    after: Nullable<Keyset>,
  ) => Detail<
    Nullable<{ session: SessionEvents["session"]; page: Page<SessionEvents["data"][number]> }>
  >;
  visits: (project: ProjectID, visitor: VisitorID, page: Offset) => Detail<Page<Visit>>;
  people: (projects: ProjectID[], page: Offset) => Detail<Page<PersonRow>>;
  person: (projects: ProjectID[], userId: string) => Detail<Nullable<Person>>;
};
