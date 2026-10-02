import type { WebhookBody } from "@spoar/contract";
import { postJson } from "@spoar/shared/http";
import type { Fetcher } from "@spoar/shared/http";
import { err, ok } from "@spoar/shared/result";

import { engineError } from "../../errors";
import { newestFirst } from "../events";
import { signBody } from "../sign-body";
import type { ChannelDriver, RetryPolicy } from "../types";
import { sendFailed } from "./failed";

export type WebhookOptions = { retry?: Partial<RetryPolicy>; fetch?: Fetcher };

/**
 * @name webhook
 * @description Enables the webhook channel: each batch is one signed `POST` of a `WebhookBody`
 * with `x-analytics-signature` (see `signBody`) and `x-analytics-timestamp` in Unix seconds.
 *
 * @example
 * alerts({ channels: [webhook({ retry: { attempts: 10 } })] });
 */
export function webhook(options: WebhookOptions = {}): ChannelDriver<"webhook"> {
  return {
    name: "webhook",
    retry: options.retry ?? {},
    ready: () => ok(null),
    describe: () => null,
    async send(batch, now) {
      const secret = batch.target.secret;
      if (!secret) {
        return err(engineError("UNAVAILABLE", `${batch.target.name} has no signing secret`));
      }
      const body: WebhookBody = {
        v: 1,
        sentAt: now.toISOString(),
        events: newestFirst(batch.deliveries.map((delivery) => delivery.event)),
      };
      const timestamp = Math.floor(now.getTime() / 1000);
      const sent = await postJson(batch.target.settings.url, body, {
        headers: {
          "user-agent": "remcostoeten-analytics",
          "x-analytics-signature": await signBody(JSON.stringify(body), secret, timestamp),
          "x-analytics-timestamp": String(timestamp),
        },
        fetch: options.fetch,
      });
      return sent.ok ? ok(null) : sendFailed(sent.error);
    },
  };
}
