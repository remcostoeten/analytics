import type { ClientError, ClientErrorCode, ClientResult } from "@spoar/client";
import type { Fetcher } from "@spoar/shared/http";
import type { Milliseconds } from "@spoar/shared/semantic";

export type AdminErrorCode = ClientErrorCode;

export type AdminError = ClientError;

export type AdminResult<Value> = ClientResult<Value>;

export type AdminOptions = {
  endpoint: string;
  token: string | undefined;
  fetch?: Fetcher;
  timeoutMs?: Milliseconds;
};
