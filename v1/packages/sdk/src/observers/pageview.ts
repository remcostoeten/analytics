import { trackPageView } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime } from "../utilities";

const NAVIGATION_EVENT = "__analytics:navigate";

function dispatchNavigationEvent(): void {
	window.dispatchEvent(new Event(NAVIGATION_EVENT));
}

export function onRouteChange(handler: (path: string) => void): () => void {
	if (isRuntime("server")) return () => {};

	let currentPath = window.location.pathname;

	function check(): void {
		const nextPath = window.location.pathname;
		if (nextPath === currentPath) return;
		currentPath = nextPath;
		handler(nextPath);
	}

	window.addEventListener(NAVIGATION_EVENT, check);
	window.addEventListener("popstate", check);

	return () => {
		window.removeEventListener(NAVIGATION_EVENT, check);
		window.removeEventListener("popstate", check);
	};
}

function trackPathChange(currentPath: { value: string }, options: AnalyticsOptions): void {
	const nextPath = window.location.pathname;
	if (nextPath === currentPath.value) return;

	currentPath.value = nextPath;
	trackPageView(undefined, options);
}

export function observePageViews(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

	const currentPath = { value: window.location.pathname };
	const originalPushState = window.history.pushState.bind(window.history);
	const originalReplaceState = window.history.replaceState.bind(window.history);

	function handleNavigation(): void {
		trackPathChange(currentPath, options);
	}

	function pushState(...args: Parameters<History["pushState"]>): void {
		originalPushState(...args);
		dispatchNavigationEvent();
	}

	function replaceState(...args: Parameters<History["replaceState"]>): void {
		originalReplaceState(...args);
		dispatchNavigationEvent();
	}

	trackPageView(undefined, options);

	window.history.pushState = pushState;
	window.history.replaceState = replaceState;
	window.addEventListener("popstate", handleNavigation);
	window.addEventListener(NAVIGATION_EVENT, handleNavigation);

	return () => {
		window.history.pushState = originalPushState;
		window.history.replaceState = originalReplaceState;
		window.removeEventListener("popstate", handleNavigation);
		window.removeEventListener(NAVIGATION_EVENT, handleNavigation);
	};
}
