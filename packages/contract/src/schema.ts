import { Type } from "@sinclair/typebox";
import type { ObjectOptions, SchemaOptions, TLiteral, TSchema, TUnion } from "@sinclair/typebox";

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
 * @description Wraps an item schema in the paginated list shape every list route returns;
 * `options` carries annotations such as `examples`.
 *
 * @example
 * const TokenList = listOf(ApiToken, { examples: [tokenList] });
 */
export function listOf<Item extends TSchema>(item: Item, options?: ObjectOptions) {
  return Type.Object(
    {
      data: Type.Array(item),
      nextCursor: nullable(
        Type.String({ description: "Send as `cursor` for the next page; null on the last page." }),
      ),
    },
    options,
  );
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
 * `"public" | "private"`. Its static type is the union of the given values; `options` carries
 * annotations such as `description` into the OpenAPI document.
 *
 * @example
 * const Visibility = oneOf(["public", "private"]);
 */
export function oneOf<const Values extends readonly [string, ...string[]]>(
  values: Values,
  options?: SchemaOptions,
): TUnion<Literals<Values>> {
  // Array.map cannot carry a tuple type through, so the union of literals is restated for TypeBox.
  return Type.Union(
    values.map((value) => Type.Literal(value)),
    options,
  ) as TUnion<Literals<Values>>;
}

export const Timestamp = Type.String({
  format: "date-time",
  description: "ISO 8601 timestamp in UTC.",
});
export const Day = Type.String({ format: "date" });
export const Id = Type.String({ minLength: 1, maxLength: 128 });
export const Count = Type.Integer({ minimum: 0 });
export const Ratio = Type.Number({
  minimum: 0,
  maximum: 1,
  description: "A fraction from 0 to 1; `0.25` is 25%.",
});
export const Milliseconds = Type.Number({ minimum: 0 });
export const Url = Type.String({ format: "uri" });
