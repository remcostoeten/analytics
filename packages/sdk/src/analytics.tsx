"use client";

import { useEffect } from "react";
import { observePageViews } from "./pageview";
import { observePerformance } from "./performance";
import { observeScroll } from "./scroll";
import { observeTimeOnPage } from "./time-on-page";

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

    const cleanupPageViews = observePageViews({ projectId, ingestUrl, debug });
    const cleanupPerformance = observePerformance({ projectId, ingestUrl, debug });
    const cleanupScroll = observeScroll({ projectId, ingestUrl, debug });
    const cleanupTimeOnPage = observeTimeOnPage({ projectId, ingestUrl, debug });

    return function cleanup() {
      cleanupPageViews();
      cleanupPerformance();
      cleanupScroll();
      cleanupTimeOnPage();
    };
  }, [projectId, ingestUrl, disabled, debug]);

  return null;
}
