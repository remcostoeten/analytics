import type {
  IngestTotals,
  LineKind,
  LineLevel,
  LineSource,
  LogData,
} from "@remcostoeten/analytics-contract";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type {
  Nullable,
  ProjectID,
  SessionID,
  VisitorID,
} from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";

export type NewLogLine = {
  project: ProjectID;
  ts: Date;
  level: LineLevel;
  kind: LineKind;
  source: LineSource;
  message: string;
  data: LogData;
  visitor: Nullable<VisitorID>;
  session: Nullable<SessionID>;
};

export type LogRecord = NewLogLine & { id: string };

export type LogFilter = {
  project: ProjectID;
  level: Nullable<LineLevel>;
  kind: Nullable<LineKind>;
  source: Nullable<LineSource>;
  visitor: Nullable<VisitorID>;
  search: Nullable<string>;
};

export type LogQuery = {
  filter: LogFilter;
  after: Nullable<string>;
  limit: number;
};

export type LogPage = { lines: LogRecord[]; cursor: string };

type Stored<Value> = Promise<Result<Value, EngineError>>;

export type LogStore = {
  write: (lines: NewLogLine[]) => Stored<null>;
  next: (query: LogQuery, wait: { ms: number; signal: Nullable<AbortSignal> }) => Stored<LogPage>;
  ingestTotals: (project: ProjectID, since: Date) => Stored<IngestTotals>;
};
