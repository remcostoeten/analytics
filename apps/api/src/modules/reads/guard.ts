import { clientIp, engineError, hashIp } from "@spoar/engine";
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
} from "@spoar/engine";
import type { Result } from "@spoar/shared/result";

import type { Caller } from "../../access/types";
import { remember } from "../../cache/remember";
import type { Remembered } from "../../cache/remember";
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
  memo?: ReadMemo;
};

export type ReadMemo = { aggregateMs: number; liveMs: number };

type GateOptions = Pick<
  ReadsOptions,
  "limiter" | "hasher" | "ipSecret" | "publicLimit" | "clock" | "memo"
>;

export type Set = { status?: unknown; headers: { [name: string]: unknown } };

export type Cache = "aggregate" | "live" | "live-private" | "private";

const windowSeconds = 60;
const sharedSeconds = 60;
const maxAgeSeconds: { [kind in Cache]: number } = {
  aggregate: 60,
  live: 15,
  "live-private": 0,
  private: 0,
};

function cacheControl(cache: Cache, shared: boolean) {
  if (cache === "aggregate" || cache === "live") {
    return shared
      ? `public, s-maxage=${sharedSeconds}`
      : `private, max-age=${maxAgeSeconds[cache]}`;
  }
  return "private, no-store";
}

function readerKey(caller: Caller) {
  if (caller.kind === "user") return `user:${caller.role}:${caller.projectIds?.join(",") ?? "*"}`;
  if (caller.kind === "token") return `token:${caller.projectIds?.join(",") ?? "*"}`;
  return "anonymous";
}

function requestKey(request: Request) {
  const url = new URL(request.url);
  url.searchParams.sort();
  return `${url.pathname}?${url.searchParams.toString()}`;
}

/**
 * @name readGate
 * @description What every read route does before and after its query: a missing project is
 * `NOT_FOUND`; aggregate and live reads of a public project get `Cache-Control: public,
 * s-maxage=60`, those of a private project `private, max-age=60` (aggregate) or `private,
 * max-age=15` (live), and everything else `private, no-store` (for reads across projects, only
 * anonymous aggregate reads are public, as the answer depends on who asks); anonymous callers are
 * rate limited per daily IP hash; an error becomes the error envelope with its status. With
 * `memo`, successful answers other than downloads are kept per instance by path and query,
 * `aggregateMs` for aggregate reads and `liveMs` for live ones, so repeated reads skip the
 * database. `list` and `listMany` also answer `format=csv|json|sql` (or `Accept: text/csv`) with
 * the whole list as one download.
 *
 * @example
 * const gate = readGate(options, docsBase);
 * return gate.answer(request, caller, project, set, "aggregate", (params, id) => run(params, id));
 */
export function readGate(options: GateOptions, docsBase: string) {
  const memos: { [kind in Cache]: Remembered<Result<unknown, EngineError>> | null } = {
    aggregate: options.memo ? remember(options.clock, options.memo.aggregateMs) : null,
    live: options.memo ? remember(options.clock, options.memo.liveMs) : null,
    "live-private": options.memo ? remember(options.clock, options.memo.liveMs) : null,
    private: null,
  };

  async function recall<Value>(
    cache: Cache,
    key: string,
    load: () => Promise<Result<Value, EngineError>>,
  ): Promise<Result<Value, EngineError>> {
    const memo = memos[cache];
    if (!memo) return load();
    // The memo holds only what load returned for this key, so the stored type is Value.
    return memo.read(key, load, (result) => result.ok) as Promise<Result<Value, EngineError>>;
  }

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
    set.headers["cache-control"] = cacheControl(cache, project.visibility === "public");
    const refused = await limited(request, caller);
    if (refused) return reject(refused, set);
    const params = new URL(request.url).searchParams;
    const result = exportFormat(request)
      ? await run(params, project.id)
      : await recall(cache, `${project.id}\u0000${requestKey(request)}`, () =>
          run(params, project.id),
        );
    return result.ok ? result.value : reject(result.error, set);
  }

  async function answerMany<Value>(
    request: Request,
    caller: Caller,
    set: Set,
    cache: Cache,
    run: (params: URLSearchParams) => Promise<Result<Value, EngineError>>,
  ) {
    set.headers["cache-control"] = cacheControl(cache, caller.kind === "anonymous");
    const refused = await limited(request, caller);
    if (refused) return reject(refused, set);
    const params = new URL(request.url).searchParams;
    const result = exportFormat(request)
      ? await run(params)
      : await recall(cache, `${readerKey(caller)}\u0000${requestKey(request)}`, () => run(params));
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
