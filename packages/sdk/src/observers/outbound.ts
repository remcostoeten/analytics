import { track } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime } from "../utilities";

export function observeOutboundLinks(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

	function handleClick(event: MouseEvent): void {
		const anchor = (event.target as Element).closest("a");
		if (!anchor) return;

		const href = anchor.getAttribute("href");
		if (!href) return;

		try {
			const url = new URL(href, window.location.href);
			if (url.origin === window.location.origin) return;

			track(
				"event",
				{
					eventName: "outbound_click",
					url: href,
					domain: url.hostname,
					text: (anchor.textContent ?? "").trim().slice(0, 100) || undefined,
				},
				options,
			);
		} catch {
			// unparseable href — skip
		}
	}

	document.addEventListener("click", handleClick);
	return () => document.removeEventListener("click", handleClick);
}
