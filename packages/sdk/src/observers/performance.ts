import { track } from "../api/track";
import { type AnalyticsOptions } from "../types";
import { isRuntime, noop } from "../utilities";

type WebVitals = {
	ttfb?: number;
	fcp?: number;
	lcp?: number;
	cls?: number;
	inp?: number;
};

type LayoutShift = PerformanceEntry & {
	hadRecentInput?: boolean;
	value?: number;
};

type InteractionEntry = PerformanceEntry & {
	duration?: number;
};

function getFcp(): number | undefined {
	if (isRuntime("server") || !window.performance) return undefined;
	const entry = performance.getEntriesByName("first-contentful-paint")[0];
	return entry ? Math.round(entry.startTime) : undefined;
}

function getNavigationTiming(): WebVitals {
	if (isRuntime("server") || !window.performance) return {};
	const nav = performance.getEntriesByType("navigation")[0] as
		| PerformanceNavigationTiming
		| undefined;
	if (!nav) return {};
	return {
		ttfb: Math.round(nav.responseStart - nav.requestStart),
		fcp: getFcp(),
	};
}

function observeLcp(callback: (value: number) => void): void {
	if (typeof PerformanceObserver === "undefined") return;
	try {
		new PerformanceObserver((list) => {
			const last = list.getEntries().at(-1);
			if (last) callback(Math.round(last.startTime));
		}).observe({ type: "largest-contentful-paint", buffered: true });
	} catch {
		noop();
	}
}

function observeCls(callback: (value: number) => void): void {
	if (typeof PerformanceObserver === "undefined") return;
	let clsValue = 0;
	try {
		new PerformanceObserver((list) => {
			for (const entry of list.getEntries()) {
				const shift = entry as LayoutShift;
				if (!shift.hadRecentInput && shift.value) clsValue += shift.value;
			}
			callback(Math.round(clsValue * 1000) / 1000);
		}).observe({ type: "layout-shift", buffered: true });
	} catch {
		noop();
	}
}

function observeInp(callback: (value: number) => void): void {
	if (typeof PerformanceObserver === "undefined") return;
	try {
		new PerformanceObserver((list) => {
			const last = list.getEntries().at(-1) as InteractionEntry | undefined;
			if (last?.duration) callback(Math.round(last.duration));
		}).observe({ type: "event", buffered: true });
	} catch {
		noop();
	}
}

export function observePerformance(options: AnalyticsOptions = {}): () => void {
	if (isRuntime("server")) return () => {};

	const vitals: WebVitals = {};
	let sent = false;

	const send = () => {
		if (sent) return;
		const merged = { ...getNavigationTiming(), ...vitals };
		if (Object.keys(merged).length === 0) return;
		sent = true;
		track("event", { eventName: "web-vitals", ...merged }, options);
	};

	observeLcp((v) => (vitals.lcp = v));
	observeCls((v) => (vitals.cls = v));
	observeInp((v) => (vitals.inp = v));

	document.addEventListener(
		"visibilitychange",
		() => document.visibilityState === "hidden" && send(),
	);
	window.addEventListener("beforeunload", send);

	return () => {
		document.removeEventListener("visibilitychange", send);
		window.removeEventListener("beforeunload", send);
	};
}
