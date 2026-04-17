import { track, type AnalyticsOptions } from "./track";
import { isRuntime } from "./utilities";

export function observeScroll(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) {
		return function cleanup() {};
	}

	let maxScrollDepth = 0;
	let ticking = false;

	function updateScrollDepth(): void {
		const scrollTop = window.scrollY || document.documentElement.scrollTop;
		const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;

		if (height <= 0) {
			return;
		}

		const depth = Math.round((scrollTop / height) * 100);

		if (depth > maxScrollDepth) {
			maxScrollDepth = depth;
		}
	}

	function handleScroll(): void {
		if (!ticking) {
			window.requestAnimationFrame(function () {
				updateScrollDepth();
				ticking = false;
			});
			ticking = true;
		}
	}

	function handleBeforeUnload(): void {
		if (maxScrollDepth > 0) {
			track("event", { eventName: "scroll", depth: maxScrollDepth }, options);
		}
	}

	window.addEventListener("scroll", handleScroll, { passive: true });
	window.addEventListener("beforeunload", handleBeforeUnload);

	updateScrollDepth();

	return function cleanup() {
		handleBeforeUnload();
		window.removeEventListener("scroll", handleScroll);
		window.removeEventListener("beforeunload", handleBeforeUnload);
	};
}
