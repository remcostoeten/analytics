import { createOpenAPI } from "fumadocs-openapi/server";

export const openapi = createOpenAPI({
  input: ["../api/openapi.json"],
});

/**
 * @name operationSlug
 * @description The file name the reference generator gives an operation page: its method and path in
 * kebab case, so `GET /v2/projects/{project}/stats` becomes `get-v2-projects-project-stats`.
 *
 * @example
 * operationSlug("get", "/v2/projects/{project}/stats"); // "get-v2-projects-project-stats"
 */
export function operationSlug(method: string, path: string) {
  return kebab(`${method} ${path}`);
}

/**
 * @name kebab
 * @description Lowercases a value and joins its alphanumeric runs with dashes, dropping path braces.
 *
 * @example
 * kebab("Visitor-level reads"); // "visitor-level-reads"
 */
export function kebab(value: string) {
  return value
    .replaceAll("{", "")
    .replaceAll("}", "")
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part.length > 0)
    .join("-")
    .toLowerCase();
}
