export type SignInState = "idle" | "busy" | "error";

export type LabelPosition = "before" | "active" | "after";

const order: SignInState[] = ["idle", "busy", "error"];

/**
 * @name labelPosition
 * @description Where a label sits relative to the active state, so a leaving label slides up
 * and an arriving label slides in from below, in the order idle, busy, error.
 *
 * @example
 * labelPosition("idle", "busy"); // "before"
 * labelPosition("busy", "busy"); // "active"
 */
export function labelPosition(label: SignInState, state: SignInState): LabelPosition {
  const delta = order.indexOf(label) - order.indexOf(state);
  if (delta === 0) return "active";
  return delta < 0 ? "before" : "after";
}
