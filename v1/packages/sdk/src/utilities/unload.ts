/**
 * Register a handler that fires when the page is being unloaded or backgrounded.
 * Uses `visibilitychange` (→ hidden) and `pagehide`, which fire reliably on
 * mobile where `beforeunload` often does not. Returns a cleanup function that
 * removes both listeners.
 */
export function onUnload(handler: () => void): () => void {
	if (typeof document === "undefined" || typeof window === "undefined") return () => {};

	const onVisibility = () => {
		if (document.visibilityState === "hidden") handler();
	};

	document.addEventListener("visibilitychange", onVisibility);
	window.addEventListener("pagehide", handler);

	return () => {
		document.removeEventListener("visibilitychange", onVisibility);
		window.removeEventListener("pagehide", handler);
	};
}
