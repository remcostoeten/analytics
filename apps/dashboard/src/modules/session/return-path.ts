/**
 * @name returnPath
 * @description Reads the `next` query value of the sign-in page as a dashboard path to return to
 * after signing in. Anything that is not a plain path inside the dashboard, such as a full URL, a
 * protocol-relative `//host` or a backslash trick, reads as the dashboard home.
 *
 * @example
 * returnPath("/admin/tokens"); // "/admin/tokens"
 * returnPath("https://example.com"); // ""
 */
export function returnPath(value: string | string[] | undefined): string {
  if (typeof value !== "string") return "";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "";
  return value;
}
