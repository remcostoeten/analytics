import { track } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime, time, onUnload } from "../utilities";
import { onRouteChange } from "./pageview";

export function observeTimeOnPage(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

	let totalTimeMs = 0;
	let lastStartTime = time();
	let isPaused = false;
	let sent = false;

	function sendTimeOnPage(): void {
		if (sent) return;
		const currentSessionTime = isPaused ? 0 : time(lastStartTime);
		const finalTimeMs = totalTimeMs + currentSessionTime;

		if (finalTimeMs > 0) {
			sent = true;
			track("event", { eventName: "time-on-page", timeOnPageMs: finalTimeMs }, options);
		}
	}

	function resetForRoute(): void {
		sendTimeOnPage();
		totalTimeMs = 0;
		lastStartTime = time();
		isPaused = false;
		sent = false;
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
