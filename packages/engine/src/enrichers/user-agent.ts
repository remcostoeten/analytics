import { UAParser } from "ua-parser-js";

import { defineEnricher } from "../define";
import { deviceClass } from "../utilities/device-class";

/**
 * @name userAgent
 * @description Parses the user agent into browser, OS and device class, and adds the screen,
 * viewport, language and connection the browser sent in `context`.
 *
 * @example
 * createEngine(ports, { ...registry, enrichers: [forwardedProxy, userAgent] }, settings);
 */
export const userAgent = defineEnricher({
  name: "user-agent",
  enrich: (draft) => {
    const ua = draft.enrichment.client.userAgent;
    const parsed = new UAParser(ua ?? "");
    const browser = parsed.getBrowser();
    const os = parsed.getOS();
    const context = draft.event.context;
    return {
      device: {
        type: deviceClass(ua),
        browser: browser.name ?? null,
        browserVersion: browser.version ?? null,
        os: os.name ?? null,
        osVersion: os.version ?? null,
        screen: context?.screen ?? null,
        viewport: context?.viewport ?? null,
        language: context?.lang ?? null,
        connection: context?.connection ?? null,
      },
    };
  },
});
