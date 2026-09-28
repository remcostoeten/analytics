import type { Engine, Logger } from "@remcostoeten/analytics-engine";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Elysia } from "elysia";

import { resolveCaller } from "./access/caller";
import { isSignedInAdmin } from "./access/rules";
import type { AccessDeps } from "./access/types";
import { authModule } from "./modules/auth/route";
import { combinedModule } from "./modules/combined/route";
import { detailsModule } from "./modules/details/route";
import { eventsModule } from "./modules/events/route";
import { healthModule } from "./modules/health/route";
import { jobsModule } from "./modules/jobs/route";
import { projectsModule } from "./modules/projects/route";
import { queryModule } from "./modules/query/route";
import type { QueryOptions } from "./modules/query/service";
import { readsModule } from "./modules/reads/route";
import { speedModule } from "./modules/speed/route";
import type { ReadsOptions } from "./modules/reads/guard";
import { tokensModule } from "./modules/tokens/route";
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
  access: AccessDeps;
  reads: ReadsOptions;
  query: QueryOptions;
  authHandler: Nullable<(request: Request) => Promise<Response>>;
};

async function signedInAdmin(headers: Headers, access: AccessDeps) {
  if (!headers.get("cookie")) return false;
  const caller = await resolveCaller(headers, access);
  return caller.ok && isSignedInAdmin(caller.value);
}

/**
 * @name createApp
 * @description Builds the v2 API under `/v2`: request ids, CORS, the error envelope, OpenAPI docs,
 * health, ingest, sign-in, projects, tokens, the reads and the SQL console. The engine is created per request so its log
 * lines carry the request id. Events sent with a signed-in admin's session cookie are internal.
 *
 * @example
 * const app = createApp({ engine, logger, clock: () => new Date(), dashboardOrigin: null, docsBase, geo, access, authHandler: null });
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
        isAdmin: (headers) => signedInAdmin(headers, options.access),
      }),
    )
    .use(
      authModule({
        deps: options.access,
        docsBase: options.docsBase,
        handler: options.authHandler,
      }),
    )
    .use(projectsModule(options.access, options.docsBase))
    .use(tokensModule(options.access, options.docsBase))
    .use(readsModule(options.access, options.reads, options.docsBase))
    .use(speedModule(options.access, options.reads, options.docsBase))
    .use(detailsModule(options.access, options.reads, options.docsBase))
    .use(combinedModule(options.access, options.reads, options.docsBase))
    .use(queryModule(options.access, options.query, options.docsBase))
    .use(
      jobsModule(
        options.access,
        { speed: options.reads.speed, clock: options.clock },
        options.docsBase,
      ),
    );
}
