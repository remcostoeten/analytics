/**
 * @name cx
 * @description Joins class names, skipping empty and false values.
 *
 * @example
 * cx("row", open && "open"); // "row open"
 */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
