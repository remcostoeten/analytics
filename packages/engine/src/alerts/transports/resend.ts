import { postJson } from "@remcostoeten/analytics-shared/http";
import type { Fetcher } from "@remcostoeten/analytics-shared/http";
import { err, ok } from "@remcostoeten/analytics-shared/result";

import { engineError } from "../../errors";
import { sendFailed } from "../channels/failed";
import type { MailTransport } from "../types";

export type ResendOptions = { fetch?: Fetcher };

const endpoint = "https://api.resend.com/emails";

/**
 * @name resend
 * @description Sends mail through Resend's HTTP API with one `POST`. An empty key does not stop
 * the API: `ready` reports it and mail targets turn `paused`.
 *
 * @example
 * mail({ transport: resend(process.env.RESEND_API_KEY), from: "Analytics <alerts@remcostoeten.nl>" });
 */
export function resend(key: string | undefined, options: ResendOptions = {}): MailTransport {
  function ready() {
    return key ? ok(null) : err(engineError("UNAVAILABLE", "The Resend API key is not set"));
  }

  return {
    name: "resend",
    host: "api.resend.com",
    ready,
    async send(message) {
      const checked = ready();
      if (!checked.ok) return checked;
      const sent = await postJson(
        endpoint,
        {
          from: message.from,
          to: message.to,
          subject: message.subject,
          text: message.text,
          html: message.html,
        },
        { headers: { authorization: `Bearer ${key}` }, fetch: options.fetch },
      );
      return sent.ok ? ok(null) : sendFailed(sent.error);
    },
  };
}
