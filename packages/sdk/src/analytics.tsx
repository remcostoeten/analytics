"use client";

import { useEffect } from "react";
import { observePageViews } from "./pageview";
import { observePerformance } from "./performance";
import { observeScroll } from "./scroll";
import { observeTimeOnPage } from "./time-on-page";
import { type AnalyticsOptions } from "./track";
import { debugLog } from "./utilities";

type Props = AnalyticsOptions & {
	disabled?: boolean;
};

export function Analytics({ projectId, ingestUrl, disabled = false, debug = false }: Props) {
	useEffect(() => {
		if (disabled) {
			debugLog(debug, "Tracking disabled via prop");
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
