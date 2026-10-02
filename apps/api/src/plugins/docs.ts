import { openapi } from "@elysiajs/openapi";

export const apiTags = [
  { name: "Ingest", description: "Send events from browsers and servers" },
  {
    name: "Sign-in",
    description: "GitHub sign-in through Better Auth and the current session",
  },
  { name: "Projects", description: "Projects, their visibility and keys" },
  { name: "Tokens", description: "API tokens for scripts and CI" },
  { name: "Reads", description: "Aggregate reads for one project" },
  {
    name: "Visitor-level reads",
    description: "Events, visitors and sessions at the detail level",
  },
  { name: "All projects", description: "The same reads across every readable project" },
  { name: "Speed", description: "Core Web Vitals and the Real Experience Score" },
  { name: "Issues", description: "Error tracking, issues and error rules" },
  { name: "SQL", description: "The read-only SQL console and saved queries" },
  { name: "Jobs", description: "Scheduled jobs and operations metrics" },
  { name: "System", description: "Health and documentation" },
];

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
      servers: [{ url: "https://api.analytics.remcostoeten.nl", description: "Production" }],
      tags: apiTags,
    },
  });
}
