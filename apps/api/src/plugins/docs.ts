import { openapi } from "@elysiajs/openapi";

/**
 * @name docs
 * @description Serves the interactive API docs at `/v2/openapi` and the OpenAPI 3 document at
 * `/v2/openapi/json`, generated from the same schemas that validate requests.
 *
 * @example
 * new Elysia({ prefix: "/v2" }).use(docs("2.0.0-next"));
 */
export function docs(version: string) {
  return openapi({
    path: "/openapi",
    documentation: {
      info: { title: "Analytics API", version },
      tags: [
        { name: "Ingest", description: "Send events from browsers and servers" },
        { name: "System", description: "Health and documentation" },
      ],
    },
  });
}
