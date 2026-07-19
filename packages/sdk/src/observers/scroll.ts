import { track } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime, onUnload } from "../utilities";
import { onRouteChange } from "./pageview";

export function observeScroll(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

	let maxScroll = 0;
	let reportedDepth = 0;
	let pagePath = window.location.pathname;

	const handleScroll = () => {
		const h = document.documentElement;
		const b = document.body;
		if (!h) return;

		const st = window.scrollY || h.scrollTop || (b ? b.scrollTop : 0);
		const sh = h.scrollHeight || (b ? b.scrollHeight : 0);
		const ch = h.clientHeight || 0;

		if (sh <= ch) return;

		const percent = Math.round((st / (sh - ch)) * 100);
		if (percent > maxScroll) maxScroll = Math.min(100, percent);
	};

	const sendScroll = () => {
		if (maxScroll <= reportedDepth) return;
		reportedDepth = maxScroll;
		track("event", { eventName: "scroll", depth: maxScroll }, { ...options, path: pagePath });
	};

	const resetForRoute = (nextPath: string) => {
		sendScroll();
		pagePath = nextPath;
		maxScroll = 0;
		reportedDepth = 0;
	};

	window.addEventListener("scroll", handleScroll, { passive: true });
	const removeUnload = onUnload(sendScroll);
	const removeRouteChange = onRouteChange(resetForRoute);

	return () => {
		sendScroll();
		window.removeEventListener("scroll", handleScroll);
		removeUnload();
		removeRouteChange();
	};
}
