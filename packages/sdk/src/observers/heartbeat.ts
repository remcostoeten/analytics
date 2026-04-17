import { track } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime, time } from "../utilities";

/**
 * Tracks the total active time a user spends on the page.
 * Pauses tracking when the tab is hidden and resumes when visible.
 * Sends the accumulated time on beforeunload or component cleanup.
 *
 * @param {AnalyticsOptions} [options={}] - Tracking options.
 * @returns {() => void} Cleanup function to remove listeners.
 */
export function observeTimeOnPage(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) {
		return function cleanup() {};
	}

	let totalTimeMs = 0;
	let lastStartTime = time();
	let isPaused = false;

	function sendTimeOnPage(): void {
		const currentSessionTime = isPaused ? 0 : time(lastStartTime);
		const finalTimeMs = totalTimeMs + currentSessionTime;

		if (finalTimeMs > 0) {
			track("event", { eventName: "time-on-page", timeOnPageMs: finalTimeMs }, options);
		}
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

	function handleBeforeUnload(): void {
		sendTimeOnPage();
	}

	document.addEventListener("visibilitychange", handleVisibilityChange);
	window.addEventListener("beforeunload", handleBeforeUnload);

	return function cleanup() {
		sendTimeOnPage();
		document.removeEventListener("visibilitychange", handleVisibilityChange);
		window.removeEventListener("beforeunload", handleBeforeUnload);
	};
}
