import { text, timestamp } from "drizzle-orm/pg-core";

/**
 * @name timestamps
 * @description The `created_at` and `updated_at` columns every mutable table shares, both
 * `timestamptz` defaulting to now.
 *
 * @example
 * const issues = pgTable("issues", { id: bigserial("id", { mode: "bigint" }).primaryKey(), ...timestamps() });
 */
export function timestamps() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  };
}

/**
 * @name baseEntity
 * @description A text `id` primary key plus `timestamps()`, for tables whose rows are entities
 * with a caller-chosen or generated string id.
 *
 * @example
 * const projects = pgTable("projects", { ...baseEntity(), name: text("name").notNull() });
 */
export function baseEntity() {
  return { id: text("id").primaryKey(), ...timestamps() };
}
