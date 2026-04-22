import { useEffect } from "react";
import { observePageViews } from "../observers/pageview";
import { observePerformance } from "../observers/performance";
import { observeScroll } from "../observers/scroll";
import { observeTimeOnPage } from "../observers/heartbeat";
import { type AnalyticsProps } from "../types";
import { debugLog } from "../utilities";

export function Analytics({
	projectId,
	ingestUrl,
	disabled = false,
	debug = false,
}: AnalyticsProps) {
	useEffect(() => {
		if (disabled) {
			debugLog(debug, "Tracking disabled");
			return;
		}

		const cleanups = [
			observePageViews({ projectId, ingestUrl, debug }),
			observePerformance({ projectId, ingestUrl, debug }),
			observeScroll({ projectId, ingestUrl, debug }),
			observeTimeOnPage({ projectId, ingestUrl, debug }),
		];

		return () => cleanups.forEach((c) => c());
	}, [projectId, ingestUrl, disabled, debug]);

	return null;
}
