import { Type } from "@sinclair/typebox";
import type { TLiteral, TSchema, TUnion } from "@sinclair/typebox";

import { registerFormats } from "./formats";

registerFormats();

type Literals<Values extends readonly string[]> = {
  -readonly [Key in keyof Values]: TLiteral<Values[Key]>;
};

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

/**
 * @name oneOf
 * @description A union of string literals, the TypeBox 0.34 form of a finite set such as
 * `"public" | "private"`. Its static type is the union of the given values.
 *
 * @example
 * const Visibility = oneOf(["public", "private"]);
 */
export function oneOf<const Values extends readonly [string, ...string[]]>(
  values: Values,
): TUnion<Literals<Values>> {
  // Array.map cannot carry a tuple type through, so the union of literals is restated for TypeBox.
  return Type.Union(values.map((value) => Type.Literal(value))) as TUnion<Literals<Values>>;
}

export const Timestamp = Type.String({ format: "date-time" });
export const Day = Type.String({ format: "date" });
export const Id = Type.String({ minLength: 1, maxLength: 128 });
export const Count = Type.Integer({ minimum: 0 });
export const Ratio = Type.Number({ minimum: 0, maximum: 1 });
export const Milliseconds = Type.Number({ minimum: 0 });
export const Url = Type.String({ format: "uri" });
