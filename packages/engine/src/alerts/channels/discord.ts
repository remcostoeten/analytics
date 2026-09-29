import { postJson } from "@remcostoeten/analytics-shared/http";
import type { Fetcher } from "@remcostoeten/analytics-shared/http";
import { ok } from "@remcostoeten/analytics-shared/result";

import { renderDiscord } from "../render-discord";
import type { ChannelDriver, RetryPolicy } from "../types";
import { sendFailed } from "./failed";

export type DiscordOptions = { retry?: Partial<RetryPolicy>; fetch?: Fetcher };

/**
 * @name discord
 * @description Enables the Discord channel: each batch is one message to the target's Discord
 * webhook URL, rendered by `renderDiscord`.
 *
 * @example
 * alerts({ channels: [discord({ retry: { maxAge: "1h" } })] });
 */
export function discord(options: DiscordOptions = {}): ChannelDriver<"discord"> {
  return {
    name: "discord",
    retry: options.retry ?? {},
    ready: () => ok(null),
    describe: () => null,
    async send(batch) {
      const sent = await postJson(batch.target.settings.url, renderDiscord(batch), {
        fetch: options.fetch,
      });
      return sent.ok ? ok(null) : sendFailed(sent.error);
    },
  };
}
