import { noop } from "@remcostoeten/analytics-shared/noop";

/**
 * @name copyText
 * @description Copies text to the clipboard. A blocked clipboard is ignored.
 *
 * @example
 * copyText(visitor.id);
 */
export function copyText(text: string) {
  void navigator.clipboard?.writeText(text).catch(noop);
}
