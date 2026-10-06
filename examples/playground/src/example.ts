import { isRecord, list, record, text } from "./json";
import type { Json, JsonRecord } from "./json";

const maxDepth = 6;

function resolve(schema: JsonRecord, components: JsonRecord) {
  const ref = text(schema.$ref);
  if (!ref.startsWith("#/components/schemas/")) return schema;
  return record(components[ref.slice("#/components/schemas/".length)]);
}

function stringExample(schema: JsonRecord, name: string) {
  const format = text(schema.format);
  if (format === "date-time") return new Date().toISOString();
  if (format === "date") return new Date().toISOString().slice(0, 10);
  if (format === "uuid" || name === "id" || name === "visitor") return crypto.randomUUID();
  if (format === "uri" || name === "url") return "https://example.com/pricing";
  if (format === "email") return "you@example.com";
  if (name === "name") return "signup";
  if (name === "session") return crypto.randomUUID().slice(0, 8);
  if (name === "path") return "/pricing";
  return name || "example";
}

function build(schema: JsonRecord, components: JsonRecord, name: string, depth: number): Json {
  const resolved = resolve(schema, components);
  const examples = list(resolved.examples);
  if (examples.length > 0 && examples[0] !== undefined) return examples[0];
  if (resolved.example !== undefined) return resolved.example;
  if (resolved.const !== undefined) return resolved.const;
  if (resolved.default !== undefined) return resolved.default;
  const options = list(resolved.enum);
  if (options.length > 0 && options[0] !== undefined) return options[0];
  const variants = [...list(resolved.anyOf), ...list(resolved.oneOf)].filter(isRecord);
  const usable = variants.find((variant) => variant.type !== "null");
  if (usable) return build(usable, components, name, depth);
  if (depth > maxDepth) return null;
  const type = text(resolved.type);
  if (type === "object" || isRecord(resolved.properties)) {
    const properties = record(resolved.properties);
    const required = list(resolved.required).map((key) => text(key));
    const keys = required.length > 0 ? required : Object.keys(properties);
    return Object.fromEntries(
      keys.map((key) => [key, build(record(properties[key]), components, key, depth + 1)]),
    );
  }
  if (type === "array") {
    const items = record(resolved.items);
    if (Object.keys(items).length === 0) return [];
    return [build(items, components, name, depth + 1)];
  }
  if (type === "integer" || type === "number") {
    return typeof resolved.minimum === "number" ? resolved.minimum : 1;
  }
  if (type === "boolean") return true;
  if (type === "string") return stringExample(resolved, name);
  return null;
}

/**
 * @name exampleFor
 * @description Builds a plausible JSON value for an OpenAPI schema: the schema's own example when
 * it has one, otherwise its required properties filled from formats, enums and defaults.
 *
 * @example
 * exampleFor({ type: "object", required: ["title"], properties: { title: { type: "string" } } }, {});
 * // { title: "title" }
 */
export function exampleFor(schema: JsonRecord, components: JsonRecord): Json {
  return build(schema, components, "", 0);
}

/**
 * @name eventBatchExample
 * @description A one-event batch for `POST /v2/events`, built from the spec's `WireEvent` schema
 * so the sample keeps up with the contract.
 *
 * @example
 * const body = eventBatchExample(components);
 */
export function eventBatchExample(components: JsonRecord): Json {
  const event = build(record(components.WireEvent), components, "", 0);
  return {
    v: 1,
    sentAt: new Date().toISOString(),
    events: [isRecord(event) ? { ...event, props: { source: "playground" } } : event],
  };
}
