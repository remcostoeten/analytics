"use client";

import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { browserClient } from "@/shared/api/browser-client";
import { PrefetchProvider } from "@/shared/query/prefetch";

import { prefetchHref } from "../prefetch";

type Props = { children: ReactNode };

export function AnalyticsPrefetch({ children }: Props) {
  const queryClient = useQueryClient();
  return (
    <PrefetchProvider prefetch={(href) => prefetchHref(queryClient, browserClient(), href)}>
      {children}
    </PrefetchProvider>
  );
}
