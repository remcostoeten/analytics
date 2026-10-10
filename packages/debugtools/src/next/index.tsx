"use client";

import dynamic from "next/dynamic";

import type { DebugtoolsOptions } from "../options";

const Lazy = dynamic(() => import("../react/debugtools").then((module) => module.Debugtools), {
  ssr: false,
});

/**
 * @name Debugtools
 * @description The debug console for the Next.js App Router: a client component that loads the
 * React entry with `next/dynamic` and `ssr: false`, so nothing of it renders or runs on the
 * server. Place it in the root layout.
 *
 * @example
 * <Debugtools endpoint={process.env.NEXT_PUBLIC_ANALYTICS_URL} project="site" />
 */
export function Debugtools(props: DebugtoolsOptions) {
  return <Lazy {...props} />;
}

export type { DebugtoolsOptions } from "../options";
