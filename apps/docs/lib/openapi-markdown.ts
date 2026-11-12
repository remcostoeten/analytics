import type {
  Document,
  HttpMethods,
  MediaTypeObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
  RequestBodyObject,
  ResponseObject,
} from "fumadocs-openapi";

import { openapi, operationSlug } from "@/lib/openapi";

type MediaEntry = MediaTypeObject | ReferenceObject;
type Schema = NonNullable<MediaTypeObject["schema"]>;
type SchemaObject = Exclude<Schema, ReferenceObject | boolean>;

const specPath = "../api/openapi.json";
const methods = [
  "get",
  "put",
  "post",
  "delete",
  "options",
  "head",
  "patch",
  "trace",
  "query",
] as const satisfies readonly HttpMethods[];
const schemaRef = /#\/components\/schemas\/([\w.-]+)/g;

function isReference<Value>(value: Value | ReferenceObject): value is ReferenceObject {
  return typeof value === "object" && value !== null && "$ref" in value;
}

function schemaObject(schema: Schema | undefined): SchemaObject | undefined {
  if (schema === undefined || typeof schema === "boolean" || isReference(schema)) return undefined;
  return schema;
}

function cell(value: string) {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function json(value: Schema) {
  return ["```json", JSON.stringify(value, null, 2), "```"].join("\n");
}

function preferredSchema(content: Record<string, MediaEntry> | undefined) {
  if (!content) return undefined;
  const media = content["application/json"] ?? Object.values(content)[0];
  return media && !isReference(media) ? media.schema : undefined;
}

function parameterType(parameter: ParameterObject) {
  const schema = schemaObject(parameter.schema);
  if (!schema) return "";
  const enumValues = schema.enum?.map((value) => `\`${String(value)}\``).join(", ");
  return enumValues ?? String(schema.type ?? "");
}

function parameterDescription(parameter: ParameterObject) {
  return parameter.description ?? schemaObject(parameter.schema)?.description ?? "";
}

function parametersSection(operation: OperationObject) {
  const parameters = (operation.parameters ?? []).filter(
    (parameter): parameter is ParameterObject => !isReference(parameter),
  );
  if (parameters.length === 0) return [];
  const rows = parameters.map(
    (parameter) =>
      `| \`${parameter.name}\` | ${parameter.in} | ${parameter.required ? "yes" : "no"} | ${cell(parameterType(parameter))} | ${cell(parameterDescription(parameter))} |`,
  );
  return [
    "## Parameters",
    "",
    "| Name | In | Required | Type | Description |",
    "| --- | --- | --- | --- | --- |",
    ...rows,
  ];
}

function requestBodySection(body: RequestBodyObject | ReferenceObject | undefined) {
  if (!body || isReference(body)) return [];
  const types = Object.keys(body.content ?? {});
  const schema = preferredSchema(body.content);
  if (!schema) return [];
  return [
    "## Request body",
    "",
    `Content types: ${types.map((type) => `\`${type}\``).join(", ")}.`,
    "",
    json(schema),
  ];
}

function responseBody(status: string, response: ResponseObject | ReferenceObject) {
  if (isReference(response)) return `See \`${response.$ref}\`.`;
  const description = response.description ?? "";
  const schema = preferredSchema(response.content);
  if (!schema) return description;
  if (isReference(schema)) return `${description}\n\nBody: \`${schema.$ref}\`.`;
  return status.startsWith("2") ? `${description}\n\n${json(schema)}` : description;
}

function responsesSection(operation: OperationObject) {
  const groups = new Map<string, string[]>();
  for (const [status, response] of Object.entries(operation.responses ?? {})) {
    const body = responseBody(status, response);
    groups.set(body, [...(groups.get(body) ?? []), status]);
  }
  if (groups.size === 0) return [];
  return [
    "## Responses",
    "",
    ...[...groups].flatMap(([body, statuses]) => [`### ${statuses.join(", ")}`, "", body, ""]),
  ];
}

function referencedSchemas(document: Document, start: string) {
  const schemas = document.components?.schemas ?? {};
  const found = new Map<string, Schema>();
  const queue = [...start.matchAll(schemaRef)].map((match) => match[1]);
  for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
    const schema = schemas[name];
    if (found.has(name) || !schema) continue;
    found.set(name, schema);
    queue.push(...[...JSON.stringify(schema).matchAll(schemaRef)].map((match) => match[1]));
  }
  return found;
}

function schemasSection(document: Document, rendered: string) {
  const schemas = referencedSchemas(document, rendered);
  if (schemas.size === 0) return [];
  return [
    "## Schemas",
    "",
    ...[...schemas].flatMap(([name, schema]) => [
      `### ${name}`,
      "",
      `\`#/components/schemas/${name}\``,
      "",
      json(schema),
      "",
    ]),
  ];
}

function securityLine(operation: OperationObject) {
  const schemes = (operation.security ?? []).map((requirement) => Object.keys(requirement));
  if (schemes.length === 0) return "";
  const options = schemes.map((names) => (names.length === 0 ? "none" : names.join(" and ")));
  return `Auth: ${options.join(", or ")}.`;
}

function findOperation(document: Document, slug: string) {
  for (const [path, item] of Object.entries(document.paths ?? {})) {
    const method = methods.find(
      (candidate) => item?.[candidate] && operationSlug(candidate, path) === slug,
    );
    const operation = method ? item?.[method] : undefined;
    if (method && operation) return { path, method, operation };
  }
  return undefined;
}

/**
 * @name operationMarkdown
 * @description Renders the API route behind a generated reference page from the OpenAPI document as
 * Markdown: method and path, auth, parameters, request body, responses with the success schemas, and
 * every component schema they reference.
 *
 * @example
 * await operationMarkdown("get-v2-projects-project-stats");
 */
export async function operationMarkdown(slug: string) {
  "use cache";

  const { bundled } = await openapi.getSchema(specPath);
  const found = findOperation(bundled, slug);
  if (!found) return undefined;
  const { path, method, operation } = found;

  const auth = securityLine(operation);
  const body = [
    `\`${method.toUpperCase()} ${path}\``,
    ...(operation.description ? ["", operation.description] : []),
    ...(auth ? ["", auth] : []),
    "",
    ...parametersSection(operation),
    "",
    ...requestBodySection(operation.requestBody),
    "",
    ...responsesSection(operation),
  ].join("\n");

  return [body, ...schemasSection(bundled, body)].join("\n\n").replace(/\n{3,}/g, "\n\n");
}
