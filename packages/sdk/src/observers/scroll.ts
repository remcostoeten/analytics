import { track } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime } from "../utilities";

export function observeScroll(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

	let maxScroll = 0;

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
		if (maxScroll > 0) {
			track("event", { eventName: "scroll", depth: maxScroll }, options);
		}
	};

	window.addEventListener("scroll", handleScroll, { passive: true });
	window.addEventListener("beforeunload", sendScroll);

	return () => {
		sendScroll();
		window.removeEventListener("scroll", handleScroll);
		window.removeEventListener("beforeunload", sendScroll);
	};
}
