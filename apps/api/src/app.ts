import type { AnnotationStore, Engine, Logger, OpsStore } from "@spoar/engine";
import type { Nullable } from "@spoar/shared/semantic";
import { Elysia } from "elysia";

import { resolveCaller } from "./access/caller";
import { isSignedInAdmin } from "./access/rules";
import type { AccessDeps } from "./access/types";
import { adminModule } from "./modules/admin/route";
import { alertsModule } from "./modules/alerts/route";
import { annotationsModule } from "./modules/annotations/route";
import type { AlertsDeps } from "./modules/alerts/service";
import type { CruxOptions } from "./modules/jobs/crux";
import { authModule } from "./modules/auth/route";
import { combinedModule } from "./modules/combined/route";
import { detailsModule } from "./modules/details/route";
import { eventsModule } from "./modules/events/route";
import { healthModule } from "./modules/health/route";
import { issuesModule } from "./modules/issues/route";
import { jobsModule } from "./modules/jobs/route";
import { projectsModule } from "./modules/projects/route";
import { queryModule } from "./modules/query/route";
import type { QueryOptions } from "./modules/query/service";
import { readsModule } from "./modules/reads/route";
import { speedModule } from "./modules/speed/route";
import type { ReadsOptions } from "./modules/reads/guard";
import { tokensModule } from "./modules/tokens/route";
import { cors } from "./plugins/cors";
import { internalCapture } from "./plugins/capture";
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
  annotations: AnnotationStore;
  authHandler: Nullable<(request: Request) => Promise<Response>>;
  ops?: Nullable<OpsStore>;
  alerts?: Nullable<AlertsDeps>;
  crux?: Nullable<CruxOptions>;
  internalSecret?: Nullable<string>;
};

async function signedInAdmin(headers: Headers, access: AccessDeps) {
  if (!headers.get("cookie")) return false;
  const caller = await resolveCaller(headers, access);
  return caller.ok && isSignedInAdmin(caller.value);
}

/**
 * @name createApp
 * @description Builds the v2 API under `/v2`: request ids, CORS, the error envelope, OpenAPI docs,
 * health, ingest, sign-in, projects, tokens, the reads, annotations, the SQL console and, with `alerts`, the
 * alert routes. The engine is created per request so its log
 * lines carry the request id. Events sent with a signed-in admin's session cookie are internal.
 * With `internalSecret`, the API's own `INTERNAL` errors go to the project with that secret key.
 *
 * @example
 * const app = createApp({ engine, logger, clock: () => new Date(), dashboardOrigin: null, docsBase, geo, access, authHandler: null });
 * const response = await app.handle(new Request("http://localhost/v2/health"));
 */
export function createApp(options: AppOptions) {
  const ops = options.ops ?? null;
  return new Elysia({ prefix: "/v2" })
    .use(requestId())
    .use(cors({ dashboardOrigin: options.dashboardOrigin }))
    .use(
      errorHandler({
        docsBase: options.docsBase,
        logger: options.logger,
        capture: options.internalSecret
          ? internalCapture({
              engine: options.engine,
              logger: options.logger,
              secretKey: options.internalSecret,
              clock: options.clock,
            })
          : undefined,
      }),
    )
    .use(docs(version))
    .use(healthModule({ version, clock: options.clock, geo: options.geo }))
    .use(
      eventsModule({
        engine: options.engine,
        logger: options.logger,
        clock: options.clock,
        docsBase: options.docsBase,
        isAdmin: (headers) => signedInAdmin(headers, options.access),
        count: ops ? (at, count) => ops.countIngest(at, count) : undefined,
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
    .use(issuesModule(options.access, options.reads, options.docsBase))
    .use(detailsModule(options.access, options.reads, options.docsBase))
    .use(combinedModule(options.access, options.reads, options.docsBase))
    .use(annotationsModule(options.access, options.reads, options.annotations, options.docsBase))
    .use(queryModule(options.access, options.query, options.docsBase))
    .use(
      jobsModule(
        options.access,
        {
          speed: options.reads.speed,
          issues: options.reads.issues,
          ops,
          alerts: options.alerts ?? null,
          crux: options.crux ?? null,
          clock: options.clock,
        },
        options.docsBase,
      ),
    )
    .use(adminModule(options.access, { ops, clock: options.clock }, options.docsBase))
    .use(
      options.alerts
        ? alertsModule(options.access, options.alerts, options.clock, options.docsBase)
        : new Elysia({ name: "alerts-off" }),
    );
}
