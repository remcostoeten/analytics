import type { ChannelName } from "@spoar/contract";
import type { Result } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

import type { EngineError } from "../errors";
import type { DeliveryBatch } from "../ports/alerts";

export type DurationUnit = "s" | "m" | "h" | "d";

export type Duration = `${number}${DurationUnit}`;

export type Backoff = "exponential" | "fixed";

export type RetryPolicy = { attempts: number; backoff: Backoff; maxAge: Duration };

export type MailMessage = {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
};

export type TransportName = "smtp" | "resend";

export type MailTransport = {
  name: TransportName;
  host: Nullable<string>;
  ready: () => Result<null, EngineError>;
  send: (message: MailMessage) => Promise<Result<null, EngineError>>;
};

export type ChannelDriver<Name extends ChannelName = ChannelName> = {
  name: Name;
  retry: Partial<RetryPolicy>;
  ready: () => Result<null, EngineError>;
  send(batch: DeliveryBatch<Name>, now: Date): Promise<Result<null, EngineError>>;
  describe: () => Nullable<{ name: TransportName; host: Nullable<string>; from: string }>;
};
