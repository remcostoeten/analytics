import { renderMail } from "../render-mail";
import type { ChannelDriver, MailTransport, RetryPolicy } from "../types";

export type MailOptions = { transport: MailTransport; from: string; retry?: Partial<RetryPolicy> };

/**
 * @name mail
 * @description Enables the mail channel: each batch is one mail from `from` to the target's
 * recipients, rendered by `renderMail` and sent by `transport`, `smtp(url)` or `resend(key)`.
 *
 * @example
 * alerts({ channels: [mail({ transport: smtp(process.env.MAIL_URL), from: "Analytics <remco@gmail.com>" })] });
 */
export function mail(options: MailOptions): ChannelDriver<"mail"> {
  return {
    name: "mail",
    retry: options.retry ?? {},
    ready: () => options.transport.ready(),
    describe: () => ({
      name: options.transport.name,
      host: options.transport.host,
      from: options.from,
    }),
    send: (batch) =>
      options.transport.send({
        from: options.from,
        to: batch.target.settings.to,
        ...renderMail(batch),
      }),
  };
}
