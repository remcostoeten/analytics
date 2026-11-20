import type { Device } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";
import { UAParser } from "ua-parser-js";

import { defineEnricher } from "../define";
import { deviceClass } from "../utilities/device-class";

type Props = Pick<Device, "type" | "browser" | "browserVersion" | "os" | "osVersion">;

const last: { ua: Nullable<string>; parsed: Nullable<Props> } = { ua: null, parsed: null };

function parse(ua: Nullable<string>): Props {
  if (last.parsed && last.ua === ua) return last.parsed;
  const parser = new UAParser(ua ?? "");
  const browser = parser.getBrowser();
  const os = parser.getOS();
  const parsed = {
    type: deviceClass(ua),
    browser: browser.name ?? null,
    browserVersion: browser.version ?? null,
    os: os.name ?? null,
    osVersion: os.version ?? null,
  };
  last.ua = ua;
  last.parsed = parsed;
  return parsed;
}

/**
 * @name userAgent
 * @description Parses the user agent into browser, OS and device class, and adds the screen,
 * viewport, language and connection the browser sent in `context`. The last user agent's parse is
 * remembered, because every event of a batch shares one.
 *
 * @example
 * createEngine(ports, { ...registry, enrichers: [forwardedProxy, userAgent] }, settings);
 */
export const userAgent = defineEnricher({
  name: "user-agent",
  enrich: (draft) => {
    const context = draft.event.context;
    return {
      device: {
        ...parse(draft.enrichment.client.userAgent),
        screen: context?.screen ?? null,
        viewport: context?.viewport ?? null,
        language: context?.lang ?? null,
        connection: context?.connection ?? null,
      },
    };
  },
});
