import { ApiError } from "@spoar/contract";
import { Elysia } from "elysia";

import { decide } from "../access/decide";
import type { AccessDeps, Level } from "../access/types";
import { failure } from "./error-handler";

// The project id segment of /v2/projects/:project and anything below it.
const projectPath = /^\/v2\/projects\/([^/]+)/;

function projectOf(url: string) {
  const segment = projectPath.exec(new URL(url).pathname)?.[1];
  if (!segment) return null;
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * @name access
 * @description The `access` route option: `{ access: "project" }` and the other levels run
 * `decide` before the handler, answer with the error envelope when the caller may not pass, and
 * give the handler `caller` and, on `/projects/:project` routes, `project`. It also registers the
 * `ApiError` model that `errorResponses` refers to, so the OpenAPI document holds it once.
 *
 * @example
 * app.use(access(deps, docsBase)).get("/projects/:project", ({ project }) => project, { access: "project" });
 */
export function access(deps: AccessDeps, docsBase: string) {
  return new Elysia({ name: "access" }).model({ ApiError }).macro({
    access: (level: Level) => ({
      resolve: async ({ request, set, status }) => {
        const decision = await decide(level, request.headers, projectOf(request.url), deps);
        if (decision.ok) return decision.value;
        const failed = failure(decision.error, set.headers, docsBase);
        // Resolve cannot answer with a typed error body; a thrown status is Elysia's early exit.
        throw status(failed.status, failed.body);
      },
    }),
  });
}
