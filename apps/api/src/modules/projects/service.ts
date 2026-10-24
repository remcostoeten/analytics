import type {
  CreateProject,
  KeyStatus,
  KeyUsage,
  Project,
  PublicProject,
  UpdatedProject,
  UpdateProject,
} from "@spoar/contract";
import { engineError } from "@spoar/engine";
import type {
  EngineError,
  KeyCheckRecord,
  KeyCheckState,
  KeyState,
  LogStore,
  ProjectRecord,
  SecretKeyCheck,
  Visibility,
} from "@spoar/engine";
import { organizationId } from "@spoar/engine/adapters/access";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

import { canAdmin, isListed, isOwner } from "../../access/rules";
import { randomSecret } from "../../access/secrets";
import type { AccessDeps, Caller } from "../../access/types";

type Created = Project & { secretKey: string };

const logRetentionMs = 7 * 24 * 60 * 60 * 1000;

/**
 * @name publicShape
 * @description The fields anyone who may read a project sees.
 *
 * @example
 * publicShape(project); // { id, name, domain, visibility, createdAt }
 */
function publicShape(project: ProjectRecord): PublicProject {
  return {
    id: project.id,
    name: project.name,
    domain: project.domain,
    visibility: project.visibility,
    createdAt: project.createdAt.toISOString(),
  };
}

/**
 * @name keyUsageOf
 * @description When and from which origin each key of a project last authorized a batch.
 *
 * @example
 * keyUsageOf(project).public.lastUsedAt;
 */
export function keyUsageOf(project: ProjectRecord): KeyUsage {
  return {
    public: {
      lastUsedAt: project.publicKeyUsedAt?.toISOString() ?? null,
      lastUsedOrigin: project.publicKeyUsedOrigin,
    },
    secret: {
      lastUsedAt: project.secretKeyUsedAt?.toISOString() ?? null,
      lastUsedOrigin: project.secretKeyUsedOrigin,
    },
  };
}

/**
 * @name adminShape
 * @description Every setting of a project, for callers who may change it. Never includes the
 * secret key.
 *
 * @example
 * adminShape(project).publicKey;
 */
function adminShape(project: ProjectRecord): Project {
  return {
    ...publicShape(project),
    publicVisitorData: project.publicVisitorData,
    sqlEnabled: project.sqlEnabled,
    widgetReports: project.widgetReports,
    debugConsole: project.debugConsole,
    allowedOrigins: project.allowedOrigins,
    retentionDays: project.retentionDays,
    publicKey: project.publicKey,
    keyUsage: keyUsageOf(project),
    updatedAt: project.updatedAt.toISOString(),
  };
}

/**
 * @name shapeFor
 * @description A project as this caller may see it: full settings for its admins, the public
 * fields for everyone else.
 *
 * @example
 * shapeFor(caller, project);
 */
export function shapeFor(caller: Caller, project: ProjectRecord): Project | PublicProject {
  return canAdmin(caller, project.id) ? adminShape(project) : publicShape(project);
}

/**
 * @name listProjects
 * @description Public projects for anyone, plus the private ones the caller lists. Organization
 * admins see every project and may filter by visibility.
 *
 * @example
 * await listProjects(deps, caller, "private");
 */
export async function listProjects(
  deps: AccessDeps,
  caller: Caller,
  visibility: Nullable<Visibility>,
): Promise<Result<(Project | PublicProject)[], EngineError>> {
  const everyone = canAdmin(caller, null);
  const found = await deps.projects.list(everyone ? visibility : null);
  if (!found.ok) return found;
  const visible = everyone
    ? found.value
    : found.value.filter(
        (project) =>
          (project.visibility === "public" || isListed(caller, project.id)) &&
          (!visibility || project.visibility === visibility),
      );
  return ok(visible.map((project) => shapeFor(caller, project)));
}

/**
 * @name createProject
 * @description Creates a project in the organization with a new public key and secret key. The
 * secret is returned once here and stored only as its sha256 hash. A taken id is `CONFLICT`.
 *
 * @example
 * await createProject(deps, { id: "docs", name: "Docs", domain: "docs.remcostoeten.nl" });
 */
export async function createProject(
  deps: AccessDeps,
  input: CreateProject,
): Promise<Result<Created, EngineError>> {
  const secretKey = randomSecret("sk_live_", 16);
  const created = await deps.projects.create({
    id: input.id,
    name: input.name,
    domain: input.domain,
    visibility: input.visibility ?? "public",
    publicVisitorData: input.publicVisitorData ?? false,
    allowedOrigins: input.allowedOrigins ?? [],
    retentionDays: input.retentionDays ?? 90,
    publicKey: randomSecret("pk_live_", 8),
    secretKeyHash: await deps.hasher.sha256(secretKey),
    orgId: organizationId,
  });
  if (!created.ok) return created;
  if (!created.value) return err(engineError("CONFLICT", `Project ${input.id} already exists`));
  return ok({ ...adminShape(created.value), secretKey });
}

/**
 * @name updateProject
 * @description Applies a settings patch and answers with the changed fields and `updatedAt`.
 *
 * @example
 * await updateProject(deps, "docs", { visibility: "private" });
 */
export async function updateProject(
  deps: AccessDeps,
  id: string,
  patch: UpdateProject,
): Promise<Result<UpdatedProject["data"], EngineError>> {
  const updated = await deps.projects.update(id, patch);
  if (!updated.ok) return updated;
  if (!updated.value) return err(engineError("NOT_FOUND", "Project not found"));
  const shaped = adminShape(updated.value);
  return ok({
    id,
    ...(patch.name === undefined ? {} : { name: shaped.name }),
    ...(patch.visibility === undefined ? {} : { visibility: shaped.visibility }),
    ...(patch.publicVisitorData === undefined
      ? {}
      : { publicVisitorData: shaped.publicVisitorData }),
    ...(patch.sqlEnabled === undefined ? {} : { sqlEnabled: shaped.sqlEnabled }),
    ...(patch.widgetReports === undefined ? {} : { widgetReports: shaped.widgetReports }),
    ...(patch.debugConsole === undefined ? {} : { debugConsole: shaped.debugConsole }),
    ...(patch.allowedOrigins === undefined ? {} : { allowedOrigins: shaped.allowedOrigins }),
    ...(patch.retentionDays === undefined ? {} : { retentionDays: shaped.retentionDays }),
    updatedAt: shaped.updatedAt,
  });
}

/**
 * @name rotateKey
 * @description Replaces the public or the secret key. The new key is returned once; a secret is
 * stored only as its hash, so the old one stops working immediately.
 *
 * @example
 * await rotateKey(deps, "docs", "secret");
 */
export async function rotateKey(
  deps: AccessDeps,
  id: string,
  kind: "public" | "secret",
): Promise<Result<{ kind: "public" | "secret"; key: string; rotatedAt: string }, EngineError>> {
  const key = kind === "public" ? randomSecret("pk_live_", 8) : randomSecret("sk_live_", 16);
  const stored = kind === "public" ? key : await deps.hasher.sha256(key);
  const rotated = await deps.projects.rotate(id, kind, stored);
  if (!rotated.ok) return rotated;
  if (!rotated.value) return err(engineError("NOT_FOUND", "Project not found"));
  return ok({ kind, key, rotatedAt: rotated.value.toISOString() });
}

/**
 * @name removeProject
 * @description Deletes a project for its owner: the row goes at once, so its keys stop at ingest
 * and its routes answer 404, and the cleanup job purges its events, sessions and other rows in
 * batches. Until that purge is done the id cannot be reused. Admins and tokens are `FORBIDDEN`.
 *
 * @example
 * await removeProject(deps, caller, "docs");
 */
export async function removeProject(
  deps: AccessDeps,
  caller: Caller,
  id: string,
): Promise<Result<null, EngineError>> {
  if (!isOwner(caller)) return err(engineError("FORBIDDEN", "Deleting a project needs the owner"));
  const removed = await deps.projects.remove(id);
  if (!removed.ok) return removed;
  if (!removed.value) return err(engineError("NOT_FOUND", "Project not found"));
  return ok(null);
}

function keyStatusOf(state: KeyState): KeyStatus["data"] {
  return {
    publicKeyCreatedAt: state.publicKeyCreatedAt.toISOString(),
    secretKeyCreatedAt: state.secretKeyCreatedAt.toISOString(),
    check: state.check,
  };
}

function stateOf(accepted: number, refused: number): KeyCheckState {
  if (accepted > 0) return "connected";
  return refused > 0 ? "rejected" : "waiting";
}

/**
 * @name keyStatus
 * @description When each current key of a project was generated and the result of its last check,
 * which is null until a check has run and after a key is rotated.
 *
 * @example
 * await keyStatus(deps, "docs");
 */
export async function keyStatus(
  deps: AccessDeps,
  id: string,
): Promise<Result<KeyStatus["data"], EngineError>> {
  const found = await deps.projects.keyState(id);
  if (!found.ok) return found;
  if (!found.value) return err(engineError("NOT_FOUND", "Project not found"));
  return ok(keyStatusOf(found.value));
}

/**
 * @name checkKeys
 * @description Checks a project's keys and stores the result. The public key counts as connected
 * when the ingest log holds accepted events since it was generated, within the 7 days the log
 * keeps. A secret key sent with the check is compared by its sha256 hash and never stored; the
 * stored hash cannot be read back, so without one the secret key is `not-tested`.
 *
 * @example
 * await checkKeys(deps, logs, "docs", "sk_live_9b8a7f6e5d4c3b2a1f0e");
 */
export async function checkKeys(
  deps: AccessDeps,
  logs: Nullable<LogStore>,
  id: string,
  secretKey: Nullable<string>,
): Promise<Result<KeyStatus["data"], EngineError>> {
  const found = await deps.projects.keyState(id);
  if (!found.ok) return found;
  const state = found.value;
  if (!state) return err(engineError("NOT_FOUND", "Project not found"));
  const now = deps.clock();
  const since = new Date(
    Math.max(state.publicKeyCreatedAt.getTime(), now.getTime() - logRetentionMs),
  );
  const totals = logs
    ? await logs.ingestTotals(id, since)
    : ok({ accepted: 0, duplicates: 0, rejected: 0, rateLimited: 0 });
  if (!totals.ok) return totals;
  const refused = totals.value.rejected + totals.value.rateLimited;
  let secret: SecretKeyCheck = "not-tested";
  if (secretKey) {
    const matched = await deps.projects.secretMatches(id, await deps.hasher.sha256(secretKey));
    if (!matched.ok) return matched;
    secret = matched.value ? "matches" : "mismatch";
  }
  const check: KeyCheckRecord = {
    checkedAt: now.toISOString(),
    state: stateOf(totals.value.accepted, refused),
    accepted: totals.value.accepted,
    rejected: refused,
    since: since.toISOString(),
    secretKey: secret,
  };
  const stored = await deps.projects.recordKeyCheck(id, check);
  if (!stored.ok) return stored;
  if (!stored.value) return err(engineError("NOT_FOUND", "Project not found"));
  return ok(keyStatusOf({ ...state, check }));
}
