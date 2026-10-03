import { clientIp, engineError, hashIp } from "@remcostoeten/analytics-engine";
import type {
  DetailStore,
  EngineError,
  Hasher,
  ProjectRecord,
  RateLimiter,
  ReadStore,
  RealtimeFeed,
  SpeedStore,
  IssueStore,
  WidgetStore,
} from "@remcostoeten/analytics-engine";
import type { Result } from "@remcostoeten/analytics-shared/result";

import type { Caller } from "../../access/types";
import { failure } from "../../plugins/error-handler";
import { exportFormat, exportList } from "./export";
import type { Listing } from "./export";
import type { LiveOptions } from "./live";

export type ReadsOptions = {
  store: ReadStore;
  details: DetailStore;
  feed: RealtimeFeed;
  speed: SpeedStore;
  issues: IssueStore;
  live: LiveOptions;
  limiter: RateLimiter;
  hasher: Hasher;
  ipSecret: string;
  publicLimit: number;
  clock: () => Date;
  widget?: WidgetStore;
};

export type Set = { status?: unknown; headers: { [name: string]: unknown } };

export type Cache = "aggregate" | "private";

const windowSeconds = 60;

/**
 * @name readGate
 * @description What every read route does before and after its query: a missing project is
 * `NOT_FOUND`; aggregate reads of a public project get `Cache-Control: public, s-maxage=60` and
 * everything else `private, no-store` (for reads across projects, only anonymous aggregate reads
 * are public, as the answer depends on who asks); anonymous callers are rate limited per daily IP hash; an
 * error becomes the error envelope with its status. `list` and `listMany` also answer
 * `format=csv|json|sql` (or `Accept: text/csv`) with the whole list as one download.
 *
 * @example
 * const gate = readGate(options, docsBase);
 * return gate.answer(request, caller, project, set, "aggregate", (params, id) => run(params, id));
 */
export function readGate(options: ReadsOptions, docsBase: string) {
  function reject(error: EngineError, set: Set) {
    const failed = failure(error, set.headers, docsBase);
    set.status = failed.status;
    return failed.body;
  }

  async function limited(request: Request, caller: Caller): Promise<EngineError | null> {
    if (caller.kind !== "anonymous") return null;
    const now = options.clock();
    const ipHash = await hashIp(
      options.hasher,
      options.ipSecret,
      clientIp(request.headers),
      now.toISOString(),
    );
    const decision = await options.limiter.hit(
      `read:${ipHash ?? "unknown"}`,
      options.publicLimit,
      windowSeconds,
    );
    if (decision.allowed) return null;
    return {
      ...engineError("RATE_LIMITED", "Too many reads; try again shortly"),
      details: { retryAfterSeconds: decision.retryAfterSeconds },
    };
  }

  async function answer<Value>(
    request: Request,
    caller: Caller,
    project: ProjectRecord | null,
    set: Set,
    cache: Cache,
    run: (params: URLSearchParams, projectId: string) => Promise<Result<Value, EngineError>>,
  ) {
    if (!project) return reject(engineError("NOT_FOUND", "Project not found"), set);
    set.headers["cache-control"] =
      cache === "aggregate" && project.visibility === "public"
        ? "public, s-maxage=60"
        : "private, no-store";
    const refused = await limited(request, caller);
    if (refused) return reject(refused, set);
    const result = await run(new URL(request.url).searchParams, project.id);
    return result.ok ? result.value : reject(result.error, set);
  }

  async function answerMany<Value>(
    request: Request,
    caller: Caller,
    set: Set,
    cache: Cache,
    run: (params: URLSearchParams) => Promise<Result<Value, EngineError>>,
  ) {
    set.headers["cache-control"] =
      cache === "aggregate" && caller.kind === "anonymous"
        ? "public, s-maxage=60"
        : "private, no-store";
    const refused = await limited(request, caller);
    if (refused) return reject(refused, set);
    const result = await run(new URL(request.url).searchParams);
    return result.ok ? result.value : reject(result.error, set);
  }

  function list<Page extends Listing>(
    request: Request,
    caller: Caller,
    project: ProjectRecord | null,
    set: Set,
    cache: Cache,
    name: string,
    run: (params: URLSearchParams, projectId: string) => Promise<Result<Page, EngineError>>,
  ) {
    const format = exportFormat(request);
    if (!format) return answer(request, caller, project, set, cache, run);
    return answer(request, caller, project, set, cache, (params, id) =>
      exportList(name, format, params, (page) => run(page, id)),
    );
  }

  function listMany<Page extends Listing>(
    request: Request,
    caller: Caller,
    set: Set,
    cache: Cache,
    name: string,
    run: (params: URLSearchParams) => Promise<Result<Page, EngineError>>,
  ) {
    const format = exportFormat(request);
    if (!format) return answerMany(request, caller, set, cache, run);
    return answerMany(request, caller, set, cache, (params) =>
      exportList(name, format, params, run),
    );
  }

  return { answer, answerMany, list, listMany, reject };
}
