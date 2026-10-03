import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable, ProjectID } from "@remcostoeten/analytics-shared/semantic";

import type { Credentials } from "./draft";
import { engineError } from "./errors";
import type { EngineError } from "./errors";
import type { Hasher, ProjectStore } from "./ports";

export type Authorized = {
  projectId: ProjectID;
  trusted: boolean;
  widgetReports: boolean;
};

function unauthorized() {
  return err(engineError("UNAUTHORIZED", "A valid X-Project-Key or secret key is required"));
}

/**
 * @name authorize
 * @description The authorize stage, run once per batch. A secret key is looked up by its sha256
 * hash and makes the request trusted, which lets forwarded visitor details through. A public key
 * needs an Origin in the project's allowed origins; an empty list allows every origin.
 *
 * @example
 * const access = await authorize(ports.projects, ports.hasher, { publicKey: "pk_live_1", secretKey: null }, "https://remcostoeten.nl");
 */
export async function authorize(
  projects: ProjectStore,
  hasher: Hasher,
  credentials: Credentials,
  origin: Nullable<string>,
): Promise<Result<Authorized, EngineError>> {
  if (credentials.secretKey) {
    const found = await projects.bySecretHash(await hasher.sha256(credentials.secretKey));
    if (!found.ok) return found;
    return found.value
      ? ok({ projectId: found.value.id, trusted: true, widgetReports: found.value.widgetReports })
      : unauthorized();
  }
  if (!credentials.publicKey) return unauthorized();
  const found = await projects.byPublicKey(credentials.publicKey);
  if (!found.ok) return found;
  if (!found.value) return unauthorized();
  const { allowedOrigins, id, widgetReports } = found.value;
  if (allowedOrigins.length > 0 && !(origin && allowedOrigins.includes(origin))) {
    return err(
      engineError(
        "FORBIDDEN_ORIGIN",
        `Origin ${origin ?? "(none)"} is not allowed for this project`,
      ),
    );
  }
  return ok({ projectId: id, trusted: false, widgetReports });
}
