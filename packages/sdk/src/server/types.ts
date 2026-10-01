import type { WireGroups } from "@remcostoeten/analytics-contract";

import type {
  ErrorContext,
  EventMap,
  EventName,
  FlushResult,
  GroupMap,
  GroupTraits,
  GroupType,
  NoProps,
  Props,
} from "../core/types";

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;
export type WaitUntil = (promise: Promise<unknown>) => void;

export type ServerConfig = {
  project?: string;
  secret?: string;
  endpoint?: string;
  release?: string;
  origin?: string;
  fetch?: Fetcher;
  waitUntil?: WaitUntil;
};

export type RequestContext = {
  request?: Request;
  groups?: WireGroups;
  headers?: Headers;
  visitor?: string;
  session?: string;
  path?: string;
  origin?: string;
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

export type ServerAnalytics<
  Events extends EventMap = EventMap,
  Groups extends GroupMap = GroupMap,
> = {
  track: <Name extends EventName<Events>>(
    name: Name,
    ...args: ServerArgs<Events, Name>
  ) => Promise<ServerResult>;
  identify: (userId: string, traits?: Props, context?: RequestContext) => Promise<ServerResult>;
  group: <Type extends GroupType<Groups>>(
    type: Type,
    id: string,
    traits?: GroupTraits<Groups, Type>,
    context?: RequestContext,
  ) => Promise<ServerResult>;
  captureError: (error: unknown, context?: ErrorContext & RequestContext) => Promise<ServerResult>;
  captureMessage: (
    message: string,
    context?: ErrorContext & RequestContext,
  ) => Promise<ServerResult>;
  scope: (tags: Props) => ServerAnalytics<Events, Groups>;
  withErrors: <Args extends unknown[]>(handler: Handler<Args>) => Handler<Args>;
  flush: () => Promise<ServerResult>;
  shutdown: () => Promise<ServerResult>;
};
