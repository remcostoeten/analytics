"use client";

import { createContext, useContext } from "react";
import type { ReactNode } from "react";

export type Prefetcher = (href: string) => void;

type Props = { prefetch: Prefetcher; children: ReactNode };

const PrefetchContext = createContext<Prefetcher | null>(null);

export function PrefetchProvider({ prefetch, children }: Props) {
  return <PrefetchContext value={prefetch}>{children}</PrefetchContext>;
}

/**
 * @name usePrefetchHref
 * @description The view's prefetcher for a link's destination, called when the pointer or focus
 * lands on the link. Outside a view nothing is prefetched.
 *
 * @example
 * const prefetch = usePrefetchHref();
 * <a onMouseEnter={() => prefetch(href)} />
 */
export function usePrefetchHref(): Prefetcher {
  const prefetch = useContext(PrefetchContext);
  return (href) => {
    prefetch?.(href);
  };
}
