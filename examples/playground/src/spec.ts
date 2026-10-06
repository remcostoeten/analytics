import { eventBatchExample, exampleFor } from "./example";
import { isRecord, list, parseJson, record, text } from "./json";
import type { JsonRecord } from "./json";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ParamLocation = "path" | "query";

export type Param = {
  name: string;
  location: ParamLocation;
  required: boolean;
  description: string;
  options: string[];
};

export type Route = {
  id: string;
  method: HttpMethod;
  path: string;
  tag: string;
  summary: string;
  description: string;
  auth: string[];
  params: Param[];
  body: string | null;
  contentType: string;
};

export type RouteGroup = {
  tag: string;
  routes: Route[];
};

export type Spec = {
  version: string;
  groups: RouteGroup[];
};

const methods: HttpMethod[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];

function parseParam(raw: JsonRecord): Param | null {
  const location = text(raw.in);
  if (location !== "path" && location !== "query") return null;
  const schema = record(raw.schema);
  const variants = [...list(schema.anyOf), ...list(schema.oneOf)].filter(isRecord);
  const options = [schema, ...variants].flatMap((option) =>
    [...list(option.enum), option.const].filter((value) => typeof value === "string"),
  );
  return {
    name: text(raw.name),
    location,
    required: raw.required === true,
    description: text(raw.description, text(schema.description)),
    options,
  };
}

function parseBody(operation: JsonRecord, path: string, components: JsonRecord) {
  const content = record(record(operation.requestBody).content);
  const contentType = Object.keys(content)[0];
  if (!contentType) return { body: null, contentType: "application/json" };
  const schema = record(record(content[contentType]).schema);
  const example =
    path === "/v2/events" ? eventBatchExample(components) : exampleFor(schema, components);
  const sendAs = contentType === "text/plain" ? "text/plain" : "application/json";
  return { body: JSON.stringify(example, null, 2), contentType: sendAs };
}

function parseRoute(
  path: string,
  method: HttpMethod,
  operation: JsonRecord,
  components: JsonRecord,
) {
  const auth = list(operation.security).flatMap((option) => Object.keys(record(option)));
  const params = list(operation.parameters)
    .filter(isRecord)
    .map(parseParam)
    .filter((param) => param !== null);
  return {
    id: `${method} ${path}`,
    method,
    path,
    tag: text(list(operation.tags)[0], "Other"),
    summary: text(operation.summary, path),
    description: text(operation.description),
    auth,
    params,
    ...parseBody(operation, path, components),
  } satisfies Route;
}

function parseSpec(raw: string): Spec | null {
  const document = parseJson(raw);
  if (!isRecord(document)) return null;
  const components = record(record(document.components).schemas);
  const routes = Object.entries(record(document.paths)).flatMap(([path, item]) =>
    methods.flatMap((method) => {
      const operation = record(item)[method.toLowerCase()];
      return isRecord(operation) ? [parseRoute(path, method, operation, components)] : [];
    }),
  );
  const order = list(document.tags).map((tag) => text(record(tag).name));
  const tags = [...new Set([...order, ...routes.map((route) => route.tag)])];
  return {
    version: text(record(document.info).version),
    groups: tags
      .map((tag) => ({ tag, routes: routes.filter((route) => route.tag === tag) }))
      .filter((group) => group.routes.length > 0),
  };
}

/**
 * @name loadSpec
 * @description Fetches the live OpenAPI document from an API base URL and parses it.
 *
 * @example
 * const spec = await loadSpec("https://api.analytics.remcostoeten.nl");
 */
export async function loadSpec(base: string): Promise<Spec | null> {
  const response = await fetch(`${base}/v2/openapi/json`);
  if (!response.ok) return null;
  return parseSpec(await response.text());
}
