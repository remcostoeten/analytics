import { track, type AnalyticsOptions } from "./track";
import { isRuntime, time } from "./utilities";

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
