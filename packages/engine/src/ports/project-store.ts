import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";

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
