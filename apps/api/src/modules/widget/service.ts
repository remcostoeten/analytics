import type { ActiveVisitors, LiveSessions, Overview, WidgetSession } from "@spoar/contract";
import { composeOverview, engineError } from "@spoar/engine";
import type {
  EngineError,
  LogStore,
  OverviewPorts,
  ProjectRecord,
  ProjectStore,
  RateLimiter,
  WidgetStore,
} from "@spoar/engine";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

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
 * @name hasSessionCookie
 * @description Whether the request carries Better Auth's session cookie at all, so the debug
 * console's routes can refuse a signed-out caller before any database read.
 *
 * @example
 * if (!hasSessionCookie(request.headers)) return unauthorized();
 */
export function hasSessionCookie(headers: Headers): boolean {
  return headers.get("cookie")?.includes("session_token") ?? false;
}

/**
 * @name startWidget
 * @description The debug console's bootstrap for a site origin: reads the session cookie first
 * (`AUTH_REQUIRED` without one, before any database read), finds the project whose allowed origins
 * list the origin (`ORIGIN_NOT_ALLOWED` when none does), checks its `debugConsole` switch
 * (`DEBUG_CONSOLE_DISABLED` while off) and that the member may administer it (`FORBIDDEN`
 * otherwise), and mints a 15-minute `wt_` widget token with the `admin` scope bound to the project.
 * The token is stored as its hash and never listed by `GET /v2/tokens`.
 *
 * @example
 * await startWidget(deps, widget, request.headers.get("origin"), request.headers);
 */
export async function startWidget(
  deps: AccessDeps,
  widget: WidgetDeps,
  origin: Nullable<string>,
  headers: Headers,
): Promise<Result<WidgetSession, EngineError>> {
  const signedIn = hasSessionCookie(headers) ? await deps.sessions(headers) : null;
  if (!signedIn) return err(engineError("AUTH_REQUIRED", "Sign in to open the debug console"));
  const found = await projectForOrigin(deps, origin);
  if (!found.ok) return found;
  const project = found.value;
  if (!project) {
    return err(engineError("ORIGIN_NOT_ALLOWED", "No project lists this origin"));
  }
  if (!project.debugConsole) {
    return err(engineError("DEBUG_CONSOLE_DISABLED", `The debug console is off for ${project.id}`));
  }
  const caller = await memberCaller(signedIn, deps);
  if (!caller.ok) return caller;
  if (!canAdmin(caller.value, project.id)) {
    return err(engineError("FORBIDDEN", `The debug console needs an admin of ${project.id}`));
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

function readLimit(params: URLSearchParams): Result<number, EngineError> {
  const limit = Number(params.get("limit") ?? defaultLimit);
  return Number.isInteger(limit) && limit >= 1 && limit <= maxLimit
    ? ok(limit)
    : err(engineError("VALIDATION_FAILED", `limit must be a whole number from 1 to ${maxLimit}`));
}

/**
 * @name liveSessions
 * @description One row per session with an event in the last five minutes, most recently active
 * first, with `limit` from 1 to 200 (default 50): the page trail, counts, duration, highest bot
 * score and its `signal` (`human`, `engaged`, `suspect` or `bot`).
 *
 * @example
 * await liveSessions(store, "docs", params, new Date());
 */
export async function liveSessions(
  store: WidgetStore,
  project: string,
  params: URLSearchParams,
  now: Date,
): Promise<Result<LiveSessions, EngineError>> {
  const limit = readLimit(params);
  if (!limit.ok) return limit;
  const from = new Date(now.getTime() - realtimeMs);
  const found = await store.sessions(project, from, now, limit.value);
  if (!found.ok) return found;
  return ok({
    data: found.value,
    window: { from: from.toISOString(), to: now.toISOString() },
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
  const limit = readLimit(params);
  if (!limit.ok) return limit;
  const from = new Date(now.getTime() - realtimeMs);
  const found = await store.active(project, from, now, limit.value);
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
