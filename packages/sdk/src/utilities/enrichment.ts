import { isRuntime } from "./runtime";

type EnrichmentData = Record<string, unknown>;

function getScreenInfo(): EnrichmentData {
	if (isRuntime("server") || !window.screen) return {};
	return {
		screenSize: `${window.screen.width}x${window.screen.height}`,
		viewport: `${window.innerWidth}x${window.innerHeight}`,
		pixelRatio: window.devicePixelRatio || 1,
	};
}

function getUtmParams(): EnrichmentData {
	if (isRuntime("server")) return {};
	const params = new URLSearchParams(window.location.search);
	const utm: EnrichmentData = {};
	const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
	for (const key of keys) {
		const value = params.get(key);
		if (value) {
			const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
			utm[camelKey] = value;
		}
	}
	return utm;
}

function getConnectionInfo(): EnrichmentData {
	if (typeof navigator === "undefined") return {};
	const conn = (navigator as any).connection;
	if (!conn) return {};
	return {
		connectionType: conn.effectiveType || null,
		connectionDownlink: conn.downlink || null,
	};
}

export function collectEnrichment(): EnrichmentData {
	return {
		...getScreenInfo(),
		...getUtmParams(),
		...getConnectionInfo(),
	};
}
