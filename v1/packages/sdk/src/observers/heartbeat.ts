import { track } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime, time, onUnload } from "../utilities";
import { onRouteChange } from "./pageview";

export function observeTimeOnPage(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

	let totalTimeMs = 0;
	let lastStartTime = time();
	let isPaused = false;
	let reportedMs = 0;
	let pagePath = window.location.pathname;

	function sendTimeOnPage(): void {
		const currentSessionTime = isPaused ? 0 : time(lastStartTime);
		const unreportedMs = totalTimeMs + currentSessionTime - reportedMs;
		if (unreportedMs <= 0) return;

		reportedMs += unreportedMs;
		track(
			"event",
			{ eventName: "time-on-page", timeOnPageMs: unreportedMs },
			{ ...options, path: pagePath },
		);
	}

	function resetForRoute(nextPath: string): void {
		sendTimeOnPage();
		pagePath = nextPath;
		totalTimeMs = 0;
		lastStartTime = time();
		isPaused = false;
		reportedMs = 0;
	}

	function handleVisibilityChange(): void {
		if (document.visibilityState === "hidden") {
			if (!isPaused) {
				totalTimeMs += time(lastStartTime);
				isPaused = true;
			}
		} else {
			if (isPaused) {
				lastStartTime = time();
				isPaused = false;
			}
		}
	}

	document.addEventListener("visibilitychange", handleVisibilityChange);
	const removeUnload = onUnload(sendTimeOnPage);
	const removeRouteChange = onRouteChange(resetForRoute);

	return () => {
		sendTimeOnPage();
		document.removeEventListener("visibilitychange", handleVisibilityChange);
		removeUnload();
		removeRouteChange();
	};
}
