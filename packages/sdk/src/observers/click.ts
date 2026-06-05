import { trackClick } from "../api/track";
import { type AnalyticsOptions, type TrackMeta } from "../types";
import { isRuntime } from "../utilities";

const ANALYTICS_ATTR = "data-analytics";
const ANALYTICS_META_ATTR = "data-analytics-meta";

function parseMeta(raw: string | null): TrackMeta | undefined {
	if (!raw) return undefined;

	try {
		return JSON.parse(raw) as TrackMeta;
	} catch {
		return undefined;
	}
}

function findAnalyticsTarget(target: EventTarget | null): Element | null {
	if (!(target instanceof Element)) return null;
	return target.closest(`[${ANALYTICS_ATTR}]`);
}

export function observeClicks(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

	function handleClick(event: MouseEvent): void {
		const target = findAnalyticsTarget(event.target);
		if (!target) return;

		const name = target.getAttribute(ANALYTICS_ATTR);
		if (!name) return;

		const meta = parseMeta(target.getAttribute(ANALYTICS_META_ATTR));
		trackClick(name, meta, options);
	}

	document.addEventListener("click", handleClick);

	return function () {
		document.removeEventListener("click", handleClick);
	};
}
