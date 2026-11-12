"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useEffect, useRef, useState } from "react";

import { usePrefetchHref } from "@/shared/query/prefetch";

type Props = Omit<ComponentProps<typeof NextLink>, "prefetch">;

const intentMs = 80;

/**
 * @name Link
 * @description `next/link` that asks the surrounding view to prefetch the destination's data once
 * the pointer or focus has rested on it for a moment, or at once on a touch, so the next view
 * renders with data on click while a pointer sweeping across the sidebar reads nothing. Admin links
 * act at once and also switch to a full route prefetch, since the admin pages still render their URL-dependent
 * parts on the server. Links are `nofollow`, so a crawler that reads a public project's page does
 * not walk every filter combination.
 *
 * @example
 * <Link href={`/projects/${project}/speed`}>Speed</Link>
 */
export function Link({
  href,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onTouchStart,
  ...rest
}: Props) {
  const [intent, setIntent] = useState(false);
  const prefetchHref = usePrefetchHref();
  const pending = useRef<ReturnType<typeof setTimeout>>(undefined);
  const target = typeof href === "string" ? href : null;
  const admin = target !== null && target.startsWith("/admin");

  useEffect(() => () => clearTimeout(pending.current), []);

  function intend() {
    setIntent(true);
    if (target !== null) prefetchHref(target);
  }

  function settle() {
    clearTimeout(pending.current);
    if (admin) intend();
    else pending.current = setTimeout(intend, intentMs);
  }

  function leave() {
    clearTimeout(pending.current);
  }

  return (
    <NextLink
      rel="nofollow"
      href={href}
      {...rest}
      prefetch={intent && admin ? true : "auto"}
      onMouseEnter={(event) => {
        settle();
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        leave();
        onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        settle();
        onFocus?.(event);
      }}
      onBlur={(event) => {
        leave();
        onBlur?.(event);
      }}
      onTouchStart={(event) => {
        intend();
        onTouchStart?.(event);
      }}
    />
  );
}
