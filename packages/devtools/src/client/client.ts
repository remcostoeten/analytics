import { request } from "@remcostoeten/analytics-shared/http";
import type {
  Fetcher,
  HttpError,
  Json,
  JsonBody,
  Query,
} from "@remcostoeten/analytics-shared/http";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { ID, Nullable, ProjectID, VisitorID } from "@remcostoeten/analytics-shared/semantic";

import type {
  Bootstrap,
  ClientReport,
  Issue,
  IssueEvent,
  LiveSession,
  LogEntry,
  OnlineVisitor,
  Overview,
  Page,
  SpeedRoute,
  VisitorDetail,
} from "./types";

export type ClientResult<Value> = Promise<Result<Value, HttpError>>;

export type ClientOptions = {
  endpoint: string;
  project: ProjectID;
  fetch?: Fetcher;
  now?: () => number;
};

export type Call = {
  method: "GET" | "POST";
  route: string;
  query?: Query;
  body?: JsonBody;
};

export type Client = {
  bootstrap: () => ClientResult<Bootstrap>;
  token: () => ClientResult<string>;
  base: () => string;
  visitors: () => ClientResult<Page<OnlineVisitor>>;
  visitor: (id: VisitorID) => ClientResult<{ data: VisitorDetail }>;
  sessions: () => ClientResult<Page<LiveSession>>;
  logs: (after: Nullable<string>, path: Nullable<string>) => ClientResult<Page<LogEntry>>;
  report: (entries: ClientReport[]) => ClientResult<Json>;
  overview: () => ClientResult<{ data: Overview }>;
  speed: () => ClientResult<Page<SpeedRoute>>;
  issues: () => ClientResult<Page<Issue>>;
  issueEvents: (id: ID) => ClientResult<Page<IssueEvent>>;
};

export const refreshAheadMs = 60_000;

function trusted<Body>(body: Json): Result<Body, string> {
  // The API checks every answer against the contract before sending it (decision 10).
  return ok(body as Body);
}

function trimSlash(value: string) {
  let base = value;
  while (base.endsWith("/")) base = base.slice(0, -1);
  return base;
}

/**
 * @name createClient
 * @description The widget's API client: one method per route it reads, each resolving to a
 * `Result` and never throwing. `bootstrap` exchanges the admin session cookie for a bearer token
 * at `GET /v2/widget/session`; every other call sends that token and fetches a new one 60
 * seconds before `expiresAt`, sharing one refresh between concurrent calls.
 *
 * @example
 * const client = createClient({ endpoint: "https://api.example.com", project: "site" });
 * const visitors = await client.visitors();
 * if (visitors.ok) console.log(visitors.value.data.length);
 */
export function createClient(options: ClientOptions, initial: Nullable<Bootstrap> = null): Client {
  const base = trimSlash(options.endpoint);
  const now = options.now ?? (() => Date.now());
  const send: Fetcher = options.fetch ?? ((url, init) => fetch(url, init));
  let session = initial;
  let pending: Nullable<ClientResult<Bootstrap>> = null;

  async function bootstrap(): ClientResult<Bootstrap> {
    const answer = await request<{ data: Bootstrap }>({
      method: "GET",
      url: `${base}/v2/widget/session`,
      query: { project: options.project },
      fetch: (url, init) => send(url, { ...init, credentials: "include" }),
      parse: trusted,
    });
    if (!answer.ok) return answer;
    session = answer.value.body.data;
    return ok(session);
  }

  function refresh() {
    pending ??= bootstrap().finally(() => {
      pending = null;
    });
    return pending;
  }

  async function token(): ClientResult<string> {
    if (session && Date.parse(session.expiresAt) - refreshAheadMs > now()) return ok(session.token);
    const fresh = await refresh();
    return fresh.ok ? ok(fresh.value.token) : fresh;
  }

  async function call<Body>(input: Call): ClientResult<Body> {
    const bearer = await token();
    if (!bearer.ok) return err(bearer.error);
    const answer = await request<Body>({
      method: input.method,
      url: `${base}${input.route}`,
      query: input.query,
      body: input.body,
      headers: { authorization: `Bearer ${bearer.value}` },
      fetch: send,
      parse: trusted,
    });
    return answer.ok ? ok(answer.value.body) : answer;
  }

  function project(route: string) {
    return `/v2/projects/${encodeURIComponent(options.project)}/${route}`;
  }

  return {
    bootstrap: refresh,
    token,
    base: () => base,
    visitors: () => call({ method: "GET", route: project("realtime/visitors") }),
    visitor: (id) => call({ method: "GET", route: project(`visitors/${encodeURIComponent(id)}`) }),
    sessions: () => call({ method: "GET", route: project("realtime/sessions") }),
    logs: (after, path) =>
      call({ method: "GET", route: project("logs"), query: { after, q: path } }),
    report: (entries) => call({ method: "POST", route: project("logs/client"), body: { entries } }),
    overview: () => call({ method: "GET", route: project("overview") }),
    speed: () => call({ method: "GET", route: project("speed/routes"), query: { period: "24h" } }),
    issues: () =>
      call({ method: "GET", route: project("issues"), query: { status: "open", period: "24h" } }),
    issueEvents: (id) =>
      call({
        method: "GET",
        route: project(`issues/${encodeURIComponent(id)}/events`),
        query: { limit: 20 },
      }),
  };
}
