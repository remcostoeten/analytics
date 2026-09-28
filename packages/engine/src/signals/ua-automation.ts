import { defineSignal } from "../define";
import { isAutomation } from "../utilities/user-agents";

/**
 * @name uaAutomation
 * @description A user agent naming an HTTP library, headless browser or test driver, or no user
 * agent at all on a browser request. A rescore of an event stored without a user agent keeps the
 * reason it had.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [uaAutomation] }, settings);
 */
export const uaAutomation = defineSignal({
  name: "ua_automation",
  weight: 100,
  replayable: true,
  detect: (draft) => {
    const userAgent = draft.enrichment.client.userAgent;
    if (userAgent) return isAutomation(userAgent);
    return draft.replay ? draft.bot.reasons.includes("ua_automation") : !draft.trusted;
  },
});
