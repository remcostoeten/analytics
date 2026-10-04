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
    runtime: Type.String({ description: "The runtime and its version, such as `bun 1.3.14`." }),
    coldStart: Type.Boolean({ description: "Whether this was the instance's first request." }),
    bootedAt: Type.String({ format: "date-time", description: "When this instance started." }),
    ipHeader: Type.Union([Type.String(), Type.Null()], {
      description:
        "The header the caller's IP was read from, such as `cf-connecting-ip`; never the address.",
    }),
    geo: Type.Object(
      {
        city: Type.Union([Type.String(), Type.Null()], {
          description: "Path of the MaxMind City database, or null when it did not load.",
        }),
        asn: Type.Union([Type.String(), Type.Null()], {
          description: "Path of the MaxMind ASN database, or null when it did not load.",
        }),
        loadMs: Type.Number({ description: "Milliseconds the databases took to load." }),
      },
      { description: "The geo databases this instance loaded." },
    ),
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
