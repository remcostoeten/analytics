import type { Result } from "@spoar/shared/result";
import type { Nullable, ProjectID } from "@spoar/shared/semantic";

import type { EngineError } from "../errors";

export type ProjectAccess = {
  id: ProjectID;
  allowedOrigins: string[];
};

type Find = (key: string) => Promise<Result<Nullable<ProjectAccess>, EngineError>>;

export type ProjectStore = {
  byPublicKey: Find;
  bySecretHash: Find;
};
