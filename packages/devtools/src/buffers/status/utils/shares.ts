import type { Share } from "../../../client/types";
import { count, percent } from "../../../ui/format";

export function shareText(share: Share) {
  return share.value <= 1 ? percent(share.value) : count(share.value);
}

export function sparkHeights(values: number[]) {
  const max = Math.max(1, ...values);
  return values.map((value) => value / max);
}
