import Type from "typebox";
import type { TSchema } from "typebox";

/**
 * @name nullable
 * @description Accepts the given schema or `null`, for fields that are always present but may be
 * empty.
 *
 * @example
 * const Geo = Type.Object({ city: nullable(Type.String()) });
 */
export function nullable<Schema extends TSchema>(schema: Schema) {
  return Type.Union([schema, Type.Null()]);
}

/**
 * @name listOf
 * @description Wraps an item schema in the paginated list shape every list route returns.
 *
 * @example
 * const TokenList = listOf(ApiToken);
 */
export function listOf<Item extends TSchema>(item: Item) {
  return Type.Object({ data: Type.Array(item), nextCursor: nullable(Type.String()) });
}

/**
 * @name dataOf
 * @description Wraps a schema in the `{ data }` envelope single-resource routes return.
 *
 * @example
 * const ProjectResponse = dataOf(Project);
 */
export function dataOf<Value extends TSchema>(value: Value) {
  return Type.Object({ data: value });
}

export const Timestamp = Type.String({ format: "date-time" });
export const Day = Type.String({ format: "date" });
export const Id = Type.String({ minLength: 1, maxLength: 128 });
export const Count = Type.Integer({ minimum: 0 });
export const Ratio = Type.Number({ minimum: 0, maximum: 1 });
export const Milliseconds = Type.Number({ minimum: 0 });
export const Url = Type.String({ format: "uri" });
