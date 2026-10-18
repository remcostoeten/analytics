"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useState } from "react";

type Props = Omit<ComponentProps<typeof NextLink>, "prefetch">;

/**
 * @name Link
 * @description `next/link` that keeps the route's shared shell prefetch and switches to a full
 * prefetch once the pointer or focus lands on it, so the destination's URL-dependent parts
 * (project name, filters, period) are ready on click. Links are `nofollow`, so a crawler that
 * reads a public project's page does not walk every filter combination.
 *
 * @example
 * <Link href={`/projects/${project}/speed`}>Speed</Link>
 */
export function Link({ onMouseEnter, onFocus, onTouchStart, ...rest }: Props) {
  const [intent, setIntent] = useState(false);
  return (
    <NextLink
      rel="nofollow"
      {...rest}
      prefetch={intent ? true : "auto"}
      onMouseEnter={(event) => {
        setIntent(true);
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        setIntent(true);
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        setIntent(true);
        onTouchStart?.(event);
      }}
    />
  );
}
