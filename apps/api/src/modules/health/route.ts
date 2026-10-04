import { Health } from "@spoar/contract";
import { Type } from "@sinclair/typebox";
import { Elysia } from "elysia";

import { ipHeader } from "../../ip-header";

export type HealthOptions = {
  version: string;
  clock: () => Date;
  geo: { city: string | null; asn: string | null; loadMs: number };
};

const HealthDetails = Type.Composite([
  Health,
  Type.Object({
    runtime: Type.String(),
    coldStart: Type.Boolean(),
    bootedAt: Type.String({ format: "date-time" }),
    ipHeader: Type.Union([Type.String(), Type.Null()]),
    geo: Type.Object({
      city: Type.Union([Type.String(), Type.Null()]),
      asn: Type.Union([Type.String(), Type.Null()]),
      loadMs: Type.Number(),
    }),
  }),
]);

/**
 * @name healthModule
 * @description `GET /v2/health`: `{ ok, version, time }` plus the runtime, whether this was the
 * instance's first request, which header carried the caller's IP, and which MaxMind files loaded.
 *
 * @example
 * new Elysia({ prefix: "/v2" }).use(healthModule({ version, clock: () => new Date(), geo }));
 */
export function healthModule(options: HealthOptions) {
  const bootedAt = options.clock().toISOString();
  const runtime = process.versions.bun
    ? `bun ${process.versions.bun}`
    : `node ${process.versions.node}`;
  let served = 0;
  return new Elysia({ name: "health" }).get(
    "/health",
    ({ request }) => {
      served += 1;
      return {
        ok: true,
        version: options.version,
        time: options.clock().toISOString(),
        runtime,
        coldStart: served === 1,
        bootedAt,
        ipHeader: ipHeader(request.headers),
        geo: options.geo,
      };
    },
    {
      response: HealthDetails,
      detail: { summary: "Liveness, version and cold start details", tags: ["System"] },
    },
  );
}
