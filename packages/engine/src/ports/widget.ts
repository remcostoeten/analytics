import type { ActiveVisitor } from "@remcostoeten/analytics-contract";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";

export type ActiveVisitorRow = ActiveVisitor;

export type ReleaseRow = {
  current: string;
  deployedAt: Date;
  newIssuesSince: number;
};

type Read<Value> = Promise<Result<Value, EngineError>>;

export type WidgetStore = {
  active: (project: ProjectID, from: Date, to: Date, limit: number) => Read<ActiveVisitorRow[]>;
  perMinute: (project: ProjectID, to: Date, minutes: number) => Read<number[]>;
  release: (project: ProjectID) => Read<Nullable<ReleaseRow>>;
};
