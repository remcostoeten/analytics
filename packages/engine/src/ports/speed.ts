import type { Result } from "@remcostoeten/analytics-shared/result";
import type { ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { EngineError } from "../errors";
import type { VitalName } from "../speed/score";

export type SpeedDevice = "mobile" | "desktop" | "all";

export type SpeedScope = {
  projectIds: ProjectID[];
  from: Date;
  to: Date;
  device: SpeedDevice;
  route: string | null;
  path: string | null;
  country: string | null;
};

export type VitalStat = {
  metric: VitalName;
  samples: number;
  value: number;
  good: number;
  needsImprovement: number;
  poor: number;
};

export type VitalDay = { day: Date; samples: number; value: number | null };

export type RouteStat = { route: string; metric: VitalName; samples: number; value: number };

export type ElementStat = { selector: string; route: string; samples: number; value: number };

type Read<Value> = Promise<Result<Value, EngineError>>;

export type SpeedStore = {
  summary: (scope: SpeedScope, percentile: number) => Read<VitalStat[]>;
  daily: (scope: SpeedScope, percentile: number, metric: VitalName) => Read<VitalDay[]>;
  routes: (scope: SpeedScope, percentile: number) => Read<RouteStat[]>;
  elements: (
    scope: SpeedScope,
    percentile: number,
    metric: VitalName,
    minSamples: number,
    page: { limit: number; offset: number },
  ) => Read<{ rows: ElementStat[]; total: number }>;
  rollup: (
    from: Date,
    to: Date,
    keepAfter: Date,
  ) => Read<{ rowsWritten: number; rowsDeleted: number }>;
};
