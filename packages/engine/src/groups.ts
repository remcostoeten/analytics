import type { WireGroups } from "@spoar/contract";

export const groupsKey = "$groups";

/**
 * @name storedGroups
 * @description Reads the groups an event was sent with back out of its stored `meta`, as the
 * contract's `WireGroups`: only string ids under valid group types, an empty object otherwise.
 *
 * @example
 * storedGroups({ plan: "pro", $groups: { company: "acme" } }); // { company: "acme" }
 */
export function storedGroups(meta: { [key: string]: unknown }): WireGroups {
  const stored = meta[groupsKey];
  if (stored === null || typeof stored !== "object" || Array.isArray(stored)) return {};
  return Object.fromEntries(
    Object.entries(stored).filter(
      (entry): entry is [string, string] =>
        /^[a-z][a-z0-9_]{0,31}$/.test(entry[0]) && typeof entry[1] === "string",
    ),
  );
}
