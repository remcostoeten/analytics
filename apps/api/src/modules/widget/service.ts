import type { ActiveVisitors, Overview, WidgetSession } from "@remcostoeten/analytics-contract";
import { composeOverview, engineError } from "@remcostoeten/analytics-engine";
import type {
  EngineError,
  LogStore,
  OverviewPorts,
  ProjectRecord,
  ProjectStore,
  RateLimiter,
  WidgetStore,
} from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import { memberCaller } from "../../access/caller";
import { canAdmin } from "../../access/rules";
import { randomSecret } from "../../access/secrets";
import type { AccessDeps } from "../../access/types";

export type WidgetDeps = {
  store: WidgetStore;
  logs: LogStore;
  keys: ProjectStore;
  limiter: RateLimiter;
  reportsPerMinute: number;
};

const tokenMinutes = 15;
const realtimeMs = 5 * 60 * 1000;
const defaultLimit = 50;
const maxLimit = 200;
const overviewMs = 10_000;
const features = { logs: true, speed: true, issues: true };

function originOf(value: string): Nullable<string> {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function listsOrigin(project: ProjectRecord, origin: string) {
  return project.allowedOrigins.some((allowed) => originOf(allowed) === origin);
}

/**
 * @name projectForOrigin
 * @description The first project, by id, whose allowed origins include the given origin, or null.
 *
 * @example
 * await projectForOrigin(deps, "https://noorderlicht.nl");
 */
export async function projectForOrigin(
  deps: AccessDeps,
  origin: Nullable<string>,
): Promise<Result<Nullable<ProjectRecord>, EngineError>> {
  const normalized = origin ? originOf(origin) : null;
  if (!normalized) return ok(null);
  const projects = await deps.projects.list(null);
  if (!projects.ok) return projects;
  return ok(projects.value.find((project) => listsOrigin(project, normalized)) ?? null);
}

/**
 * @name startWidget
 * @description The dev widget's bootstrap: finds the project from the `Origin` header
 * (`ORIGIN_NOT_ALLOWED` when none lists it), reads the session cookie (`AUTH_REQUIRED` without
 * one), checks the member may administer that project (`FORBIDDEN` otherwise), and mints a
 * 15-minute `wt_` widget token with the `admin` scope bound to the project. The token is stored
 * as its hash and never listed by `GET /v2/tokens`.
 *
 * @example
 * await startWidget(deps, widget, request.headers);
 */
export async function startWidget(
  deps: AccessDeps,
  widget: WidgetDeps,
  headers: Headers,
): Promise<Result<WidgetSession, EngineError>> {
  const found = await projectForOrigin(deps, headers.get("origin"));
  if (!found.ok) return found;
  const project = found.value;
  if (!project) {
    return err(engineError("ORIGIN_NOT_ALLOWED", "No project lists this origin"));
  }
  const signedIn = await deps.sessions(headers);
  if (!signedIn) return err(engineError("AUTH_REQUIRED", "Sign in to use the dev widget"));
  const caller = await memberCaller(signedIn, deps);
  if (!caller.ok) return caller;
  if (!canAdmin(caller.value, project.id)) {
    return err(engineError("FORBIDDEN", "The dev widget needs a project admin"));
  }
  const now = deps.clock();
  const expiresAt = new Date(now.getTime() + tokenMinutes * 60_000);
  const token = randomSecret("wt_", 16);
  const created = await deps.tokens.create({
    id: randomSecret("tok_", 8),
    kind: "widget",
    name: `Widget for ${signedIn.login ?? signedIn.userId}`,
    scope: "admin",
    projectIds: [project.id],
    expiresAt,
    tokenHash: await deps.hasher.sha256(token),
  });
  if (!created.ok) return created;
  const release = await widget.store.release(project.id);
  if (!release.ok) return release;
  return ok({
    project: project.id,
    access: "admin",
    user: { id: signedIn.userId, name: signedIn.name },
    release: release.value?.current ?? null,
    token,
    expiresAt: expiresAt.toISOString(),
    features,
  });
}

/**
 * @name activeVisitors
 * @description One row per visitor seen in the last five minutes, newest activity first, with
 * `limit` from 1 to 200 (default 50). Never the identified user's id, only whether there is one.
 *
 * @example
 * await activeVisitors(store, "docs", params, new Date());
 */
export async function activeVisitors(
  store: WidgetStore,
  project: string,
  params: URLSearchParams,
  now: Date,
): Promise<Result<ActiveVisitors, EngineError>> {
  const limit = Number(params.get("limit") ?? defaultLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
    return err(
      engineError("VALIDATION_FAILED", `limit must be a whole number from 1 to ${maxLimit}`),
    );
  }
  const from = new Date(now.getTime() - realtimeMs);
  const found = await store.active(project, from, now, limit);
  if (!found.ok) return found;
  return ok({
    data: found.value,
    window: { from: from.toISOString(), to: now.toISOString() },
  });
}

/**
 * @name overviewCache
 * @description `composeOverview` behind a per-project memory cache of 10 seconds, so the widget's
 * statusline can poll it cheaply. Failures are not cached.
 *
 * @example
 * const overview = overviewCache(ports, () => new Date());
 * await overview("docs");
 */
export function overviewCache(ports: OverviewPorts, clock: () => Date) {
  const cached = new Map<string, { at: number; value: Overview }>();
  return async function overview(project: string): Promise<Result<Overview, EngineError>> {
    const now = clock();
    const hit = cached.get(project);
    if (hit && now.getTime() - hit.at < overviewMs) return ok(hit.value);
    const composed = await composeOverview(ports, project, now);
    if (composed.ok) cached.set(project, { at: now.getTime(), value: composed.value });
    return composed;
  };
}
