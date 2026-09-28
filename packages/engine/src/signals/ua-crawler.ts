import { defineSignal } from "../define";
import { isCrawler } from "../utilities/user-agents";

/**
 * @name uaCrawler
 * @description A user agent from the named list of crawlers, preview fetchers, AI agents, SEO
 * tools and uptime monitors.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [uaCrawler] }, settings);
 */
export const uaCrawler = defineSignal({
  name: "ua_crawler",
  weight: 100,
  replayable: true,
  detect: (draft) => isCrawler(draft.enrichment.client.userAgent),
});
