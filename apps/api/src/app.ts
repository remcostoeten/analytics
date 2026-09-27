import { openapi } from "@elysiajs/openapi";
import { IngestEnvelope } from "@remcostoeten/analytics-contract";
import { Elysia, t } from "elysia";
import { Value } from "typebox/value";

import { clientIp } from "./client-ip";
import { lookupCity } from "./geo";
import type { CityDatabase } from "./geo";

const version = "2.0.0-spike.0";

const Health = t.Object({
  ok: t.Boolean(),
  version: t.String(),
  time: t.String({ format: "date-time" }),
  runtime: t.String(),
  coldStart: t.Boolean(),
  bootedAt: t.String({ format: "date-time" }),
  geo: t.Object({ loaded: t.Boolean(), path: t.Nullable(t.String()), loadMs: t.Number() }),
});

/**
 * @name createApp
 * @description Builds the spike API: health with cold start and runtime details, OpenAPI docs,
 * and an events route that validates the envelope with the contract and looks up the caller's
 * city.
 *
 * @example
 * const app = createApp(openCityDatabase(candidatePaths(null, import.meta.dir, process.cwd())));
 * const response = await app.handle(new Request("http://localhost/v2/health"));
 */
export function createApp(database: CityDatabase) {
  const bootedAt = new Date().toISOString();
  let served = 0;
  const runtime = process.versions.bun
    ? `bun ${process.versions.bun}`
    : `node ${process.versions.node}`;

  return new Elysia({ prefix: "/v2" })
    .use(
      openapi({ path: "/openapi", documentation: { info: { title: "Analytics API", version } } }),
    )
    .get(
      "/health",
      () => {
        served += 1;
        return {
          ok: true,
          version,
          time: new Date().toISOString(),
          runtime,
          coldStart: served === 1,
          bootedAt,
          geo: { loaded: database.reader !== null, path: database.path, loadMs: database.loadMs },
        };
      },
      { response: Health, detail: { summary: "Liveness, version and cold start details" } },
    )
    .post(
      "/events",
      ({ body, request, status }) => {
        const parsed: unknown = JSON.parse(body);
        if (!Value.Check(IngestEnvelope, parsed)) {
          const paths = Value.Errors(IngestEnvelope, parsed).map((error) => error.instancePath);
          return status(400, { error: { code: "VALIDATION_FAILED", paths } });
        }
        const caller = clientIp(request.headers);
        return status(202, {
          accepted: parsed.events.length,
          duplicates: 0,
          rejected: [],
          ipHeader: caller.header,
          geo: lookupCity(database.reader, caller.ip),
        });
      },
      { parse: "text", body: t.String(), detail: { summary: "Stub ingest with one City lookup" } },
    );
}
