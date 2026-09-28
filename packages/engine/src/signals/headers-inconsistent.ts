import { defineSignal } from "../define";
import { isModernBrowser, isModernChromium } from "../utilities/user-agents";

/**
 * @name headersInconsistent
 * @description A Chromium user agent without `sec-ch-ua`, or a modern browser user agent without
 * `sec-fetch-*` headers on the ingest POST. Requests with the secret key come from a server and
 * are skipped.
 *
 * @example
 * createEngine(ports, { ...registry, signals: [headersInconsistent] }, settings);
 */
export const headersInconsistent = defineSignal({
  name: "headers_inconsistent",
  weight: 30,
  replayable: false,
  detect: (draft) => {
    const userAgent = draft.enrichment.client.userAgent;
    if (draft.trusted || !userAgent) return false;
    const { headers } = draft.request;
    if (isModernChromium(userAgent) && !headers.get("sec-ch-ua")) return true;
    const fetchMetadata = headers.get("sec-fetch-mode") ?? headers.get("sec-fetch-site");
    return isModernBrowser(userAgent) && !fetchMetadata;
  },
});
