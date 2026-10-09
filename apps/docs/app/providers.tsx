"use client";

import { Analytics } from "@spoar/sdk/next";
import { AnalyticsProvider } from "@spoar/sdk/react";
import type { ReactNode } from "react";

import { analytics } from "@/lib/analytics";

type Props = {
  children: ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <AnalyticsProvider client={analytics}>
      <Analytics />
      {children}
    </AnalyticsProvider>
  );
}
