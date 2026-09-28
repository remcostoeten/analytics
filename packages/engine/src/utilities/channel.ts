import type { Channel } from "@remcostoeten/analytics-contract";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

const searchHosts = [
  "google.",
  "bing.",
  "duckduckgo.",
  "yahoo.",
  "ecosia.",
  "baidu.",
  "yandex.",
  "startpage.",
  "search.brave.",
];
const socialHosts = [
  "facebook.com",
  "instagram.com",
  "linkedin.com",
  "lnkd.in",
  "reddit.com",
  "t.co",
  "twitter.com",
  "x.com",
  "youtube.com",
  "tiktok.com",
  "threads.net",
  "bsky.app",
  "mastodon.social",
  "news.ycombinator.com",
];

// Paid mediums: cpc, ppc, cpm, paid, or anything ending in "ads".
const paidMedium = /^(cpc|ppc|cpm|paid.*|.*ads)$/i;

export type ChannelInput = {
  referrerDomain: Nullable<string>;
  siteHost: Nullable<string>;
  medium: Nullable<string>;
};

function matches(host: string, patterns: string[]) {
  return patterns.some((pattern) =>
    pattern.endsWith(".")
      ? host.includes(pattern)
      : host === pattern || host.endsWith(`.${pattern}`),
  );
}

/**
 * @name referrerDomain
 * @description The host of a referrer URL without a leading `www.`, or null when it does not
 * parse.
 *
 * @example
 * referrerDomain("https://www.google.com/search?q=x"); // "google.com"
 */
export function referrerDomain(referrer: Nullable<string> | undefined): Nullable<string> {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "") || null;
  } catch {
    return null;
  }
}

/**
 * @name channelOf
 * @description Classifies where a visit came from: the UTM medium wins, then the referrer domain;
 * no referrer is direct and a referrer on the site's own host is internal.
 *
 * @example
 * channelOf({ referrerDomain: "news.ycombinator.com", siteHost: "remcostoeten.nl", medium: null }); // "social"
 */
export function channelOf(input: ChannelInput): Channel {
  const medium = input.medium?.toLowerCase() ?? null;
  if (medium && paidMedium.test(medium)) return "paid";
  if (medium === "email" || medium === "newsletter") return "email";
  if (medium === "social") return "social";
  const domain = input.referrerDomain;
  if (!domain) return "direct";
  const site = input.siteHost?.replace(/^www\./, "").replace(/:\d+$/, "");
  if (site && domain === site) return "internal";
  if (matches(domain, searchHosts)) return "search";
  if (matches(domain, socialHosts)) return "social";
  return "referral";
}
