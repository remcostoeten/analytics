"use client";

import { useEffect } from "react";
import { observePageViews } from "../observers/pageview";
import { observePerformance } from "../observers/performance";
import { observeScroll } from "../observers/scroll";
import { observeTimeOnPage } from "../observers/heartbeat";
import { type AnalyticsOptions } from "../types";
import { debugLog } from "../utilities";

type Props = AnalyticsOptions & {
	disabled?: boolean;
};

/**
 * Root analytics component that initializes all behavioral trackers.
 * Best used in a root layout or a high-level provider.
 *
 * @param {Props} props - Component props and tracking options.
 */
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
