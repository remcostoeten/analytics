import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Nullable, ProjectID } from "@spoar/shared/semantic";

import type { Credentials } from "./draft";
import { engineError } from "./errors";
import type { EngineError } from "./errors";
import type { Hasher, ProjectStore } from "./ports";
import type { KeyKind } from "./ports/access";

export type Authorized = {
  projectId: ProjectID;
  key: KeyKind;
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
 * needs an Origin in the project's allowed origins; an empty list allows every origin. A refused
 * origin is reported to `onRefusedOrigin` with the project it was meant for.
 *
 * @example
 * const access = await authorize(ports.projects, ports.hasher, { publicKey: "pk_live_1", secretKey: null }, "https://remcostoeten.nl");
 */
export async function authorize(
  projects: ProjectStore,
  hasher: Hasher,
  credentials: Credentials,
  origin: Nullable<string>,
  onRefusedOrigin?: (project: ProjectID, origin: Nullable<string>) => Promise<void>,
): Promise<Result<Authorized, EngineError>> {
  if (credentials.secretKey) {
    const found = await projects.bySecretHash(await hasher.sha256(credentials.secretKey));
    if (!found.ok) return found;
    return found.value
      ? ok({
          projectId: found.value.id,
          key: "secret",
          trusted: true,
          widgetReports: found.value.widgetReports,
        })
      : unauthorized();
  }
  if (!credentials.publicKey) return unauthorized();
  const found = await projects.byPublicKey(credentials.publicKey);
  if (!found.ok) return found;
  if (!found.value) return unauthorized();
  const { allowedOrigins, id, widgetReports } = found.value;
  if (allowedOrigins.length > 0 && !(origin && allowedOrigins.includes(origin))) {
    await onRefusedOrigin?.(id, origin);
    return err(
      engineError(
        "FORBIDDEN_ORIGIN",
        `Origin ${origin ?? "(none)"} is not allowed for this project`,
      ),
    );
  }
  return ok({ projectId: id, key: "public", trusted: false, widgetReports });
}
