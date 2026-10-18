import type { IncomingRequestCfProperties } from "@cloudflare/workers-types";
import { memoryGeo } from "@spoar/engine/adapters/memory";
import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { buildApi } from "./build";

type EdgeRequest = Request & { cf?: IncomingRequestCfProperties };

const app = buildApi({
  geo: { lookup: memoryGeo(new Map()), city: null, asn: null, loadMs: 0 },
  adapter: CloudflareAdapter,
  commit: process.env.COMMIT_SHA || null,
}).compile();

function withEdgeLocation(request: EdgeRequest) {
  const cf = request.cf;
  if (!cf) return request;
  const headers = new Headers(request.headers);
  const location = {
    "cf-ipcountry": cf.country,
    "cf-region-code": cf.regionCode,
    "cf-ipcity": cf.city,
    "cf-postal-code": cf.postalCode,
    "cf-timezone": cf.timezone,
    "cf-iplatitude": cf.latitude,
    "cf-iplongitude": cf.longitude,
    "cf-ipcontinent": cf.continent,
  };
  for (const [name, value] of Object.entries(location)) {
    if (value) headers.set(name, encodeURIComponent(value));
  }
  return new Request(request, { headers });
}

export default {
  fetch(request: EdgeRequest) {
    return app.fetch(withEdgeLocation(request));
  },
};
