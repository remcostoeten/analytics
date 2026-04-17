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

export function Analytics({ projectId, ingestUrl, disabled = false, debug = false }: Props) {
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
