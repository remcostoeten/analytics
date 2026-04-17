import { isRuntime } from "./runtime";

/**
 * Enrichment data object containing collected browser/environment information.
 */
type EnrichmentData = Record<string, unknown>;

/**
 * Collects screen and viewport information.
 * @returns {EnrichmentData} Screen information object.
 */
function getScreenInfo(): EnrichmentData {
	if (isRuntime("server") || !window.screen) {
		return {};
	}

	return {
		screenSize: `${window.screen.width}x${window.screen.height}`,
		viewport: `${window.innerWidth}x${window.innerHeight}`,
		pixelRatio: window.devicePixelRatio || 1,
	};
}

/**
 * Parses UTM parameters from the current URL.
 * @returns {EnrichmentData} Object containing camelCased UTM parameters.
 */
function getUtmParams(): EnrichmentData {
	if (isRuntime("server")) {
		return {};
	}

	const params = new URLSearchParams(window.location.search);
	const utm: EnrichmentData = {};

	const keys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

	for (const key of keys) {
		const value = params.get(key);
		if (value) {
			const camelKey = key.replace(/_([a-z])/g, function (_match, letter) {
				return letter.toUpperCase();
			});
			utm[camelKey] = value;
		}
	}

	return utm;
}

/**
 * Collects network connection information if available.
 * @returns {EnrichmentData} Connection information object.
 */
function getConnectionInfo(): EnrichmentData {
	if (typeof navigator === "undefined") {
		return {};
	}

	const conn = (
		navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number } }
	).connection;

	if (!conn) {
		return {};
	}

	return {
		connectionType: conn.effectiveType || null,
		connectionDownlink: conn.downlink || null,
	};
}

/**
 * Core enrichment utility to gather environment data for event tracking.
 * @returns {EnrichmentData} The compiled enrichment data.
 */
export function collectEnrichment(): EnrichmentData {
	return {
		...getScreenInfo(),
		...getUtmParams(),
		...getConnectionInfo(),
	};
}
