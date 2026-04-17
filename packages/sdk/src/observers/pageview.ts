import { trackPageView } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime } from "../utilities";

const NAVIGATION_EVENT = "remco-analytics:navigate";

function dispatchNavigationEvent(): void {
	window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

function trackPathChange(currentPath: { value: string }, options: AnalyticsOptions): void {
	const nextPath = window.location.pathname;

	if (nextPath === currentPath.value) {
		return;
	}

	currentPath.value = nextPath;
	trackPageView(undefined, options);
}

/**
 * Monitors URL changes in SPAs by monkey-patching history API and listening for popstate events.
 *
 * @param {AnalyticsOptions} [options={}] - Tracking options.
 * @returns {() => void} Cleanup function to restore original history methods and remove listeners.
 */
export function observePageViews(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) {
		return function cleanup() {};
	}

	const currentPath = { value: window.location.pathname };
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);

	function handleNavigation(): void {
		trackPathChange(currentPath, options);
	}

	/** @type {typeof window.history.pushState} */
	function pushState(...args: Parameters<History["pushState"]>): void {
		originalPushState(...args);
		dispatchNavigationEvent();
	}

	/** @type {typeof window.history.replaceState} */
	function replaceState(...args: Parameters<History["replaceState"]>): void {
		originalReplaceState(...args);
		dispatchNavigationEvent();
	}

	trackPageView(undefined, options);

	window.history.pushState = pushState;
	window.history.replaceState = replaceState;
	window.addEventListener("popstate", handleNavigation);
	window.addEventListener(NAVIGATION_EVENT, handleNavigation);

	return function cleanup() {
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
		window.removeEventListener("popstate", handleNavigation);
		window.removeEventListener(NAVIGATION_EVENT, handleNavigation);
	};
}
