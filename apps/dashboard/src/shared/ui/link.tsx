"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useState } from "react";

import { usePrefetchHref } from "@/shared/query/prefetch";

type Props = Omit<ComponentProps<typeof NextLink>, "prefetch">;

/**
 * @name Link
 * @description `next/link` that asks the surrounding view to prefetch the destination's data once
 * the pointer or focus lands on it, so the next view renders with data on click. Admin links also
 * switch to a full route prefetch then, since the admin pages still render their URL-dependent
 * parts on the server. Links are `nofollow`, so a crawler that reads a public project's page does
 * not walk every filter combination.
 *
 * @example
 * <Link href={`/projects/${project}/speed`}>Speed</Link>
 */
export function Link({ href, onMouseEnter, onFocus, onTouchStart, ...rest }: Props) {
  const [intent, setIntent] = useState(false);
  const prefetchHref = usePrefetchHref();
  const target = typeof href === "string" ? href : null;
  const admin = target !== null && target.startsWith("/admin");

  function intend() {
    setIntent(true);
    if (target !== null) prefetchHref(target);
  }

  return (
    <NextLink
      rel="nofollow"
      href={href}
      {...rest}
      prefetch={intent && admin ? true : "auto"}
      onMouseEnter={(event) => {
        intend();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        intend();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        intend();
        onTouchStart?.(event);
      }}
    />
  );
}
