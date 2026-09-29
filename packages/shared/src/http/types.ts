import type { Result } from "../result";
import type { Milliseconds, Nullable } from "../semantic";

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type JsonBody = Json[] | { [key: string]: Json };

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

export type Query = { [name: string]: QueryValue | QueryValue[] };

export type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

export type HttpErrorKind =
  | "url"
  | "timeout"
  | "aborted"
  | "network"
  | "status"
  | "parse"
  | "schema";

export type HttpError = {
  kind: HttpErrorKind;
  message: string;
  method: HttpMethod;
  url: string;
  status: Nullable<number>;
  body: Nullable<string>;
};

export type HttpResponse<Body> = {
  status: number;
  headers: Headers;
  body: Body;
};

export type HttpResult<Body> = Result<HttpResponse<Body>, HttpError>;

export type Parser<Body> = (body: Json) => Result<Body, string>;

export type HttpOptions = {
  headers?: { [name: string]: string };
  query?: Query;
  timeoutMs?: Milliseconds;
  signal?: AbortSignal;
  fetch?: Fetcher;
};

export type ParsedOptions<Body> = HttpOptions & { parse: Parser<Body> };

export type RequestInput<Body> = HttpOptions & {
  method: HttpMethod;
  url: string;
  body?: JsonBody;
  parse?: Parser<Body>;
};
