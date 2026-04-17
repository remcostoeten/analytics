import { track, type AnalyticsOptions } from "./track";
import { isServer, now, timeSince } from "./utils";

export function observeTimeOnPage(options: AnalyticsOptions = {}): () => void {
	if (isServer()) {
		return function cleanup() {};
	}

	let totalTimeMs = 0;
	let lastStartTime = now();
	let isPaused = false;

	function sendTimeOnPage(): void {
		const currentSessionTime = isPaused ? 0 : timeSince(lastStartTime);
		const finalTimeMs = totalTimeMs + currentSessionTime;

		if (finalTimeMs > 0) {
			track("event", { eventName: "time-on-page", timeOnPageMs: finalTimeMs }, options);
		}
	}

	function handleVisibilityChange(): void {
		if (document.visibilityState === "hidden") {
			if (!isPaused) {
				totalTimeMs += timeSince(lastStartTime);
				isPaused = true;
			}
		} else {
			if (isPaused) {
				lastStartTime = now();
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
