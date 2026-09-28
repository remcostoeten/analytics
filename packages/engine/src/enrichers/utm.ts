import { defineEnricher } from "../define";
import { channelOf, referrerDomain } from "../utilities/channel";

/**
 * @name utm
 * @description The traffic source: referrer, referrer domain, UTM parameters and the channel they
 * add up to.
 *
 * @example
 * createEngine(ports, { ...registry, enrichers: [utm] }, settings);
 */
export const utm = defineEnricher({
  name: "utm",
  enrich: (draft) => {
    const referrer = draft.event.page.referrer ?? null;
    const domain = referrerDomain(referrer);
    const tags = draft.event.context?.utm;
    return {
      source: {
        referrer,
        referrerDomain: domain,
        channel: channelOf({
          referrerDomain: domain,
          siteHost: draft.host,
          medium: tags?.medium ?? null,
        }),
        utm: {
          source: tags?.source ?? null,
          medium: tags?.medium ?? null,
          campaign: tags?.campaign ?? null,
          term: tags?.term ?? null,
          content: tags?.content ?? null,
        },
      },
    };
  },
});
