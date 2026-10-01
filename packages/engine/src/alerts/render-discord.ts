import type { AlertEvent, ChannelName } from "@remcostoeten/analytics-contract";

import type { DeliveryBatch } from "../ports/alerts";
import { alertDetail, alertLabels, alertTime, alertTitle, alertUrl, newestFirst } from "./events";
import { alertSubject } from "./render-mail";

export type DiscordEmbed = {
  title: string;
  url: string;
  description: string;
  timestamp: string;
};

export type DiscordMessage = {
  content: string;
  embeds: DiscordEmbed[];
  allowed_mentions: { parse: never[] };
};

const maxEmbeds = 10;
const maxTitle = 256;
const maxDescription = 4096;

function clip(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length - 3)}...` : text;
}

function embed(event: AlertEvent): DiscordEmbed {
  return {
    title: clip(`${alertLabels[event.name].tag}  ${alertTitle(event)}`, maxTitle),
    url: alertUrl(event),
    description: clip(alertDetail(event), maxDescription),
    timestamp: alertTime(event),
  };
}

/**
 * @name renderDiscord
 * @description One Discord webhook message for a batch: the mail subject as its content and one
 * embed per alert, newest first, up to 10, with a line for the rest. Mentions are turned off.
 *
 * @example
 * await postJson(target.settings.url, renderDiscord(batch));
 */
export function renderDiscord<Name extends ChannelName>(
  batch: DeliveryBatch<Name>,
): DiscordMessage {
  const events = newestFirst(batch.deliveries.map((delivery) => delivery.event));
  const shown = events.slice(0, maxEmbeds);
  const rest = events.length - shown.length;
  const subject = alertSubject(batch);
  return {
    content: rest > 0 ? `${subject} (${rest} more not shown)` : subject,
    embeds: shown.map(embed),
    allowed_mentions: { parse: [] },
  };
}
