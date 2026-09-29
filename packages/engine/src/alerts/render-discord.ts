import type { AlertEvent, ChannelName } from "@remcostoeten/analytics-contract";

import type { DeliveryBatch } from "../ports/alerts";
import { alertLabels, newestFirst } from "./events";
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
  const lines = [
    event.issue.culprit,
    `${event.issue.count} ${event.issue.count === 1 ? "time" : "times"}`,
    event.issue.lastRelease ? `release ${event.issue.lastRelease}` : null,
  ].filter((line) => line !== null);
  return {
    title: clip(`${alertLabels[event.name].tag}  ${event.issue.title}`, maxTitle),
    url: event.issue.url,
    description: clip(lines.join(" · "), maxDescription),
    timestamp: event.issue.lastSeen,
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
