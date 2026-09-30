import { defineEnricher } from "../define";

export const forwardedHeaders = { ip: "x-visitor-ip", userAgent: "x-visitor-ua" } as const;

/**
 * @name forwardedProxy
 * @description On a request authorized by the project's secret key, takes the visitor's IP and
 * user agent from the event's `context` or from the forwarded headers a same-origin proxy adds.
 * When neither carries them they stay null, because the connection's own IP and user agent are
 * the calling server's, not a visitor's, and would score its events as datacenter or automation
 * traffic. Without the secret key the request headers stand, so a browser cannot claim another IP.
 *
 * @example
 * createEngine(ports, { ...registry, enrichers: [forwardedProxy, ipHash, geo] }, settings);
 */
export const forwardedProxy = defineEnricher({
  name: "forwarded-proxy",
  enrich: (draft) => {
    if (!draft.trusted) return {};
    const { client } = draft.enrichment;
    const headers = draft.request.headers;
    return {
      client: {
        ...client,
        ip: draft.event.context?.ip ?? headers.get(forwardedHeaders.ip) ?? null,
        userAgent: draft.event.context?.ua ?? headers.get(forwardedHeaders.userAgent) ?? null,
      },
    };
  },
});
