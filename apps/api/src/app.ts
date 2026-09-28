import type { Engine, Logger } from "@remcostoeten/analytics-engine";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Elysia } from "elysia";

import { eventsModule } from "./modules/events/route";
import { healthModule } from "./modules/health/route";
import { cors } from "./plugins/cors";
import { docs } from "./plugins/docs";
import { errorHandler } from "./plugins/error-handler";
import { requestId } from "./plugins/request-id";

const version = "2.0.0-next";

export type AppOptions = {
  engine: (logger: Logger) => Engine;
  logger: (requestId: string) => Logger;
  clock: () => Date;
  dashboardOrigin: Nullable<string>;
  docsBase: string;
  geo: { city: string | null; asn: string | null; loadMs: number };
};

/**
 * @name createApp
 * @description Builds the v2 API under `/v2`: request ids, CORS, the error envelope, OpenAPI docs,
 * health and ingest. The engine is created per request so its log lines carry the request id.
 *
 * @example
 * const app = createApp({ engine, logger, clock: () => new Date(), dashboardOrigin: null, docsBase, geo });
 * const response = await app.handle(new Request("http://localhost/v2/health"));
 */
export function createApp(options: AppOptions) {
  return new Elysia({ prefix: "/v2" })
    .use(requestId())
    .use(cors({ dashboardOrigin: options.dashboardOrigin }))
    .use(errorHandler({ docsBase: options.docsBase, logger: options.logger }))
    .use(docs(version))
    .use(healthModule({ version, clock: options.clock, geo: options.geo }))
    .use(
      eventsModule({
        engine: options.engine,
        logger: options.logger,
        clock: options.clock,
        docsBase: options.docsBase,
      }),
    );
}
