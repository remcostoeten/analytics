import type { Result } from "@spoar/shared/result";
import type { ProjectID } from "@spoar/shared/semantic";

import type { EngineError } from "../errors";
import type { VitalName } from "../speed/score";
import type { Environment } from "./reads";

export type SpeedDevice = "mobile" | "desktop" | "all";

export type SpeedEnvironment = Environment;

export type SpeedInterval = "hour" | "day";

export type SpeedGroup = "route" | "path";

export type SpeedScope = {
  projectIds: ProjectID[];
  from: Date;
  to: Date;
  device: SpeedDevice;
  environment: SpeedEnvironment;
  route: string | null;
  path: string | null;
  country: string | null;
  rawFrom: Date;
};

export type VitalStat = {
  metric: VitalName;
  samples: number;
  value: number;
  good: number;
  needsImprovement: number;
  poor: number;
};

export type VitalPoint = { bucket: Date; samples: number; value: number | null };

export type RouteStat = { route: string; metric: VitalName; samples: number; value: number };

export type ElementStat = { selector: string; route: string; samples: number; value: number };

type Read<Value> = Promise<Result<Value, EngineError>>;

export type SpeedStore = {
  summary: (scope: SpeedScope, percentile: number) => Read<VitalStat[]>;
  series: (
    scope: SpeedScope,
    percentile: number,
    metric: VitalName,
    interval: SpeedInterval,
  ) => Read<VitalPoint[]>;
  routes: (scope: SpeedScope, percentile: number, group: SpeedGroup) => Read<RouteStat[]>;
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
