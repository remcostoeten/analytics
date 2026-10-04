import type { ActiveVisitor, LiveSession } from "@spoar/contract";
import type { Result } from "@spoar/shared/result";
import type { Nullable, ProjectID } from "@spoar/shared/semantic";

import type { EngineError } from "../errors";

export type ActiveVisitorRow = ActiveVisitor;

export type LiveSessionRow = LiveSession;

export type ReleaseRow = {
  current: string;
  deployedAt: Date;
  newIssuesSince: number;
};

type Read<Value> = Promise<Result<Value, EngineError>>;

export type WidgetStore = {
  active: (project: ProjectID, from: Date, to: Date, limit: number) => Read<ActiveVisitorRow[]>;
  sessions: (project: ProjectID, from: Date, to: Date, limit: number) => Read<LiveSessionRow[]>;
  perMinute: (project: ProjectID, to: Date, minutes: number) => Read<number[]>;
  release: (project: ProjectID) => Read<Nullable<ReleaseRow>>;
};
