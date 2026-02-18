"use client";

import { useEffect } from "react";
import { trackPageView } from "./track";

type AnalyticsProps = {
  projectId?: string;
  ingestUrl?: string;
  disabled?: boolean;
  debug?: boolean;
};

export function Analytics({
  projectId,
  ingestUrl,
  disabled = false,
  debug = false,
}: AnalyticsProps) {
  useEffect(() => {
    if (disabled) {
      if (debug) {
        console.log("[Analytics] Tracking disabled via prop");
      }
      return;
    }

    trackPageView(undefined, { projectId, ingestUrl, debug });
  }, [projectId, ingestUrl, disabled, debug]);

  return null;
}
