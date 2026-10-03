"use client";

import dynamic from "next/dynamic";

import type { DevtoolsOptions } from "../options";

const Lazy = dynamic(() => import("../react/devtools").then((module) => module.Devtools), {
  ssr: false,
});

/**
 * @name Devtools
 * @description The dev widget for the Next.js App Router: a client component that loads the
 * React entry with `next/dynamic` and `ssr: false`, so nothing of it renders or runs on the
 * server. Place it in the root layout.
 *
 * @example
 * <Devtools endpoint={process.env.NEXT_PUBLIC_ANALYTICS_URL} project="site" />
 */
export function Devtools(props: DevtoolsOptions) {
  return <Lazy {...props} />;
}

export type { DevtoolsOptions } from "../options";
