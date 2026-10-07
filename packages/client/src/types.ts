import type {
  Environment,
  ErrorCode,
  ErrorDetails,
  FilterQuery,
  Period,
  RangeQuery,
  TrafficFilter,
} from "@spoar/contract";
import type { Fetcher, HttpMethod, JsonBody, Query } from "@spoar/shared/http";
import type { Result } from "@spoar/shared/result";
import type { Milliseconds, Nullable, Timestamp } from "@spoar/shared/semantic";

export type BuiltInMetric =
  | "visitors"
  | "sessions"
  | "pageviews"
  | "events"
  | "bounce_rate"
  | "session_duration"
  | "pages_per_session"
  | "time_on_page"
  | "scroll_depth"
  | "conversion_rate";

export type PropMetric = `sum:prop.${string}` | `avg:prop.${string}`;

export type Metric = BuiltInMetric | PropMetric;

export type BuiltInDimension =
  | "host"
  | "page"
  | "route"
  | "entry_page"
  | "exit_page"
  | "referrer"
  | "referrer_domain"
  | "channel"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_term"
  | "utm_content"
  | "country"
  | "region"
  | "city"
  | "continent"
  | "timezone"
  | "device"
  | "browser"
  | "browser_version"
  | "os"
  | "os_version"
  | "screen"
  | "viewport"
  | "language"
  | "connection"
  | "visitor_type"
  | "visit_number"
  | "days_since_previous_visit"
  | "event"
  | "issue"
  | "bot_reason"
  | "release"
  | "project";

export type CustomDimension = `prop:${string}` | `trait:${string}` | `group:${string}`;

export type Dimension = BuiltInDimension | CustomDimension;

export type Filters = { [Name in Dimension]?: string };

export type DateInput = Date | Timestamp;

export type ReadOptions = RangeQuery & Omit<FilterQuery, "filter"> & { filter?: Filters };

export type ScopeState = {
  project: Nullable<string>;
  from?: Timestamp;
  to?: Timestamp;
  period?: Period;
  traffic?: TrafficFilter;
  environment?: Environment;
  filter: Filters;
};

export type Page = { limit?: number; cursor?: string };

export type DownloadFormat = "csv" | "sql";

export type Download = { format: DownloadFormat };

export type ClientErrorCode =
  | ErrorCode
  | "NO_TOKEN"
  | "NETWORK"
  | "TIMEOUT"
  | "ABORTED"
  | "BAD_URL"
  | "BAD_RESPONSE";

export type ClientError = {
  code: ClientErrorCode;
  message: string;
  status: Nullable<number>;
  details: Nullable<ErrorDetails>;
  requestId: Nullable<string>;
};

export type ClientResult<Value> = Promise<Result<Value, ClientError>>;

export type Credentials = "include" | "same-origin" | "omit";

export type ClientOptions<Projects extends string = string> = {
  endpoint: string;
  token?: string;
  credentials?: Credentials;
  projects?: readonly Projects[];
  fetch?: Fetcher;
  timeoutMs?: Milliseconds;
};

export type Call = {
  method: HttpMethod;
  path: string;
  query?: Query;
  body?: JsonBody;
  signal?: AbortSignal;
  timeoutMs?: Milliseconds;
};

export type Send = {
  json: <Body>(call: Call) => ClientResult<Body>;
  text: (call: Call) => ClientResult<string>;
};
