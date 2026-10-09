import type { IssueStatus, StackFrame } from "@spoar/contract";

export const statusLabels: { [Status in IssueStatus]: string } = {
  open: "Open",
  resolved: "Resolved",
  ignored: "Ignored",
};

const statusActions = [
  { status: "resolved", label: "Resolve" },
  { status: "ignored", label: "Ignore" },
  { status: "open", label: "Reopen" },
] as const satisfies readonly { status: IssueStatus; label: string }[];

/**
 * @name nextStatuses
 * @description The status changes that make sense from a status: an open issue can be resolved or
 * ignored, a resolved or ignored one reopened.
 *
 * @example
 * nextStatuses("open").map((action) => action.label); // ["Resolve", "Ignore"]
 */
export function nextStatuses(status: IssueStatus) {
  return statusActions.filter((action) => action.status !== status);
}

/**
 * @name frameLocation
 * @description A stack frame as `file:line:column`, leaving out what the frame does not have.
 *
 * @example
 * frameLocation({ file: "app.js", line: 12, column: 3405, function: "PostCard", inApp: true });
 * // "app.js:12:3405"
 */
export function frameLocation(frame: StackFrame) {
  const parts = [frame.file];
  if (frame.line !== null) parts.push(String(frame.line));
  if (frame.line !== null && frame.column !== null) parts.push(String(frame.column));
  return parts.join(":");
}

/**
 * @name splitTitle
 * @description An issue title split into its error type and message, when it has the
 * `<type>: <message>` shape.
 *
 * @example
 * splitTitle("TypeError: x is undefined"); // { type: "TypeError", message: "x is undefined" }
 */
export function splitTitle(title: string) {
  const index = title.indexOf(": ");
  if (index === -1) return { type: title, message: "" };
  return { type: title.slice(0, index), message: title.slice(index + 2) };
}
