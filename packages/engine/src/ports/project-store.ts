import type { Result } from "@spoar/shared/result";
import type { Nullable, ProjectID } from "@spoar/shared/semantic";

import type { EngineError } from "../errors";
import type { KeyKind } from "./access";

export type ProjectAccess = {
  id: ProjectID;
  allowedOrigins: string[];
  widgetReports: boolean;
};

type Find = (key: string) => Promise<Result<Nullable<ProjectAccess>, EngineError>>;

export type ProjectStore = {
  byPublicKey: Find;
  bySecretHash: Find;
  markUsed: (
    id: ProjectID,
    kind: KeyKind,
    at: Date,
    origin: Nullable<string>,
  ) => Promise<Result<void, EngineError>>;
};
