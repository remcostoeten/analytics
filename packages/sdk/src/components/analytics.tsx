import { useEffect } from "react";
import { observePageViews } from "../observers/pageview";
import { observePerformance } from "../observers/performance";
import { observeScroll } from "../observers/scroll";
import { observeTimeOnPage } from "../observers/heartbeat";
import { observeClicks } from "../observers/click";
import { useAnalyticsOptions } from "./provider";
import { resolveAnalyticsOptions } from "../utilities/options";
import { type AnalyticsProps } from "../types";
import { debugLog } from "../utilities";

export function Analytics({
	projectId,
	ingestUrl,
	disabled = false,
	debug = false,
	trackClicks = false,
}: AnalyticsProps) {
	const contextOptions = useAnalyticsOptions();
	const resolved = resolveAnalyticsOptions(contextOptions, { projectId, ingestUrl, debug });

	useEffect(() => {
		if (disabled) {
			debugLog(resolved.debug, "Tracking disabled");
			return;
		}

		const cleanups = [
			observePageViews(resolved),
			observePerformance(resolved),
			observeScroll(resolved),
			observeTimeOnPage(resolved),
		];

		if (trackClicks) {
			cleanups.push(observeClicks(resolved));
		}

		return () => cleanups.forEach((c) => c());
	}, [resolved.projectId, resolved.ingestUrl, resolved.debug, disabled, trackClicks]);

	return null;
}
