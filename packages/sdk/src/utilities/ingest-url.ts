type Env = Record<string, string | undefined>;
type ImportMetaEnv = ImportMeta & {
	env?: Env;
};

function getEnv(): Env {
	if (typeof process !== "undefined" && process.env) return process.env;
	const meta = import.meta as ImportMetaEnv;
	if (meta.env) return meta.env;
	return {};
}

export function validateIngestUrl(url: string): boolean {
	try {
		const normalized = url.replace(/\/+$/, "");
		const parsed = new URL(normalized);
		return parsed.protocol === "http:" || parsed.protocol === "https:";
	} catch {
		return false;
	}
}

export function normalizeIngestUrl(url: string): string {
	return url.replace(/\/+$/, "");
}

export function resolveBrowserIngestUrl(): string {
	const env = getEnv();
	const url = env.NEXT_PUBLIC_ANALYTICS_URL || env.VITE_ANALYTICS_URL;

	if (!url) {
		if (typeof window !== "undefined") {
			console.error("[Analytics] No ingest URL configured. Set NEXT_PUBLIC_ANALYTICS_URL or VITE_ANALYTICS_URL.");
		}
		return "";
	}

	if (typeof window !== "undefined" && !validateIngestUrl(url)) {
		console.error(`[Analytics] Invalid ingestUrl: "${url}". Must be a valid http/https URL.`);
		return "";
	}

	return url;
}

export function resolveServerIngestUrl(): string {
	const env = getEnv();
	return env.ANALYTICS_URL || "";
}
