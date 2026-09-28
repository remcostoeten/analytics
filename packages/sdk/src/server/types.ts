import type { ErrorContext, EventMap, EventName, FlushResult, NoProps, Props } from "../core/types";

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export type WaitUntil = (promise: Promise<unknown>) => void;

export type ServerConfig = {
  project?: string;
  secret?: string;
  endpoint?: string;
  release?: string;
  fetch?: Fetcher;
  waitUntil?: WaitUntil;
};

export type RequestContext = {
  request?: Request;
  headers?: Headers;
  visitor?: string;
  session?: string;
  path?: string;
  waitUntil?: WaitUntil;
};

export type ServerErrorCode =
  | "RA_NO_SECRET"
  | "RA_NO_ENDPOINT"
  | "RA_INGEST_FAILED"
  | "RA_INGEST_REJECTED";

export type ServerError = {
  code: ServerErrorCode;
  message: string;
};

export type ServerResult = FlushResult &
  ({ ok: true; error: null } | { ok: false; error: ServerError });

export type ServerArgs<
  Events extends EventMap,
  Name extends EventName<Events>,
> = string extends keyof Events
  ? [props?: Props, context?: RequestContext]
  : [keyof Events[Name]] extends [never]
    ? [props?: NoProps, context?: RequestContext]
    : [props: Events[Name], context?: RequestContext];

export type Handler<Args extends unknown[]> = (
  request: Request,
  ...args: Args
) => Response | Promise<Response>;

export type ServerAnalytics<Events extends EventMap = EventMap> = {
  track: <Name extends EventName<Events>>(
    name: Name,
    ...args: ServerArgs<Events, Name>
  ) => Promise<ServerResult>;
  identify: (userId: string, traits?: Props, context?: RequestContext) => Promise<ServerResult>;
  captureError: (error: unknown, context?: ErrorContext & RequestContext) => Promise<ServerResult>;
  captureMessage: (
    message: string,
    context?: ErrorContext & RequestContext,
  ) => Promise<ServerResult>;
  scope: (tags: Props) => ServerAnalytics<Events>;
  withErrors: <Args extends unknown[]>(handler: Handler<Args>) => Handler<Args>;
  flush: () => Promise<ServerResult>;
  shutdown: () => Promise<ServerResult>;
};
