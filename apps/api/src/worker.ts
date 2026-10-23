import { CloudflareAdapter } from "elysia/adapter/cloudflare-worker";

import { buildApi } from "./build";
import { cloudflareGeo, withCloudflareGeo } from "./cloudflare-geo";
import type { CloudflareLocation } from "./cloudflare-geo";

type Props = Request & { cf?: CloudflareLocation };

const app = buildApi({
  geo: cloudflareGeo(),
  adapter: CloudflareAdapter,
  liveSocket: false,
  commit: process.env.WORKERS_CI_COMMIT_SHA || process.env.COMMIT_SHA || null,
}).compile();

export default {
  fetch(request: Props) {
    return withCloudflareGeo(request.headers.get("cf-connecting-ip"), request.cf ?? null, () =>
      app.fetch(request),
    );
  },
};
