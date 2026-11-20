"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { watchPageFocus } from "./focus";

type Props = { children: ReactNode };

const staleMs = 30_000;

const keepMs = 30 * 60_000;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: staleMs,
        gcTime: keepMs,
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function QueryProvider({ children }: Props) {
  const [client] = useState(createQueryClient);
  useEffect(() => watchPageFocus(), []);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
