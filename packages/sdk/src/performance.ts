import { track } from "./track";
import { isRuntime } from "./utilities";
import { noop } from "./noop";

type PerformanceOptions = {
	projectId?: string;
	ingestUrl?: string;
	debug?: boolean;
};

type WebVitals = {
	ttfb?: number;
	fcp?: number;
	lcp?: number;
	cls?: number;
	inp?: number;
};

function getNavigationTiming(): WebVitals {
	if (isRuntime("server") || !window.performance) {
		return {};
	}

	const entries = performance.getEntriesByType("navigation");
	const nav = entries[0] as PerformanceNavigationTiming | undefined;

	if (!nav) {
		return {};
	}

	return {
		ttfb: Math.round(nav.responseStart - nav.requestStart),
		fcp: getFcp(),
	};
}

function getFcp(): number | undefined {
	if (isRuntime("server") || !window.performance) {
		return undefined;
	}

	const entries = performance.getEntriesByName("first-contentful-paint");
	const fcp = entries[0];

	if (!fcp) {
		return undefined;
	}

	return Math.round(fcp.startTime);
}

function observeLcp(callback: (value: number) => void): void {
	if (typeof PerformanceObserver === "undefined") {
		return;
	}

	try {
		const observer = new PerformanceObserver(function (list) {
			const entries = list.getEntries();
			const last = entries[entries.length - 1];
			if (last) {
				callback(Math.round(last.startTime));
			}
		});

		observer.observe({ type: "largest-contentful-paint", buffered: true });
	} catch {
		noop();
	}
}

function observeCls(callback: (value: number) => void): void {
	if (typeof PerformanceObserver === "undefined") {
		return;
	}

	let clsValue = 0;

	try {
		const observer = new PerformanceObserver(function (list) {
			for (const entry of list.getEntries()) {
				const layoutShift = entry as PerformanceEntry & {
					hadRecentInput?: boolean;
					value?: number;
				};
				if (!layoutShift.hadRecentInput && layoutShift.value) {
					clsValue += layoutShift.value;
				}
			}
			callback(Math.round(clsValue * 1000) / 1000);
		});

		observer.observe({ type: "layout-shift", buffered: true });
	} catch {
		noop();
	}
}

function observeInp(callback: (value: number) => void): void {
	if (typeof PerformanceObserver === "undefined") {
		return;
	}

	try {
		const observer = new PerformanceObserver(function (list) {
			const entries = list.getEntries();
			const last = entries[entries.length - 1] as PerformanceEntry & { duration?: number };
			if (last && last.duration) {
				callback(Math.round(last.duration));
			}
		});

		observer.observe({ type: "event", buffered: true });
	} catch {
		noop();
	}
}

export function observePerformance(options: PerformanceOptions = {}): () => void {
	if (isRuntime("server")) {
		return function cleanup() {};
	}

	const vitals: WebVitals = {};
	let sent = false;

	function sendVitals(): void {
		if (sent) {
			return;
		}

		const navTiming = getNavigationTiming();
		const merged = { ...navTiming, ...vitals };

		if (Object.keys(merged).length === 0) {
			return;
		}

		sent = true;
		track("event", { eventName: "web-vitals", ...merged }, options);
	}

	observeLcp(function (value) {
		vitals.lcp = value;
	});

	observeCls(function (value) {
		vitals.cls = value;
	});

	observeInp(function (value) {
		vitals.inp = value;
	});

	function handleVisibilityChange(): void {
		if (document.visibilityState === "hidden") {
			sendVitals();
		}
	}

	function handleBeforeUnload(): void {
		sendVitals();
	}

	document.addEventListener("visibilitychange", handleVisibilityChange);
	window.addEventListener("beforeunload", handleBeforeUnload);

	return function cleanup() {
		document.removeEventListener("visibilitychange", handleVisibilityChange);
		window.removeEventListener("beforeunload", handleBeforeUnload);
	};
}
