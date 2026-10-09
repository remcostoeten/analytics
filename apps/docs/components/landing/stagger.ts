import type { CSSProperties } from "react";

type Staggered = CSSProperties & { "--i": number };

/**
 * @name stagger
 * @description The inline style that delays a revealed item by its position in a row, so items
 * that enter the viewport together appear one after the other.
 *
 * @example
 * <li className="reveal" style={stagger(index)} />
 */
export function stagger(index: number): Staggered {
  return { "--i": index };
}
