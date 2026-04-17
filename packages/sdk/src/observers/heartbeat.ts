import { track } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime, time } from "../utilities";

export function observeTimeOnPage(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

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

	document.addEventListener("visibilitychange", handleVisibilityChange);
	window.addEventListener("beforeunload", sendTimeOnPage);

	return () => {
		sendTimeOnPage();
		document.removeEventListener("visibilitychange", handleVisibilityChange);
		window.removeEventListener("beforeunload", sendTimeOnPage);
	};
}
