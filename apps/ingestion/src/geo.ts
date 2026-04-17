export type GeoData = {
	country: string | null;
	region: string | null;
	city: string | null;
};

type HeaderBag = {
	get(name: string): string | null;
};

type ReqData = {
	headers?: HeaderBag | null;
};

function emptyHeaders(): HeaderBag {
	return {
		get() {
			return null;
		},
	};
}

function getHeaders(req: ReqData | null | undefined): HeaderBag {
	const headers = req?.headers;
	if (!headers) {
		return emptyHeaders();
	}
	return headers;
}

function extractGeoFromVercelHeaders(headers: HeaderBag): GeoData {
	// Prefer Vercel's canonical headers to prevent spoofing
	// x-vercel-forwarded-for is overwritten by Vercel to prevent client manipulation
	const country = headers.get("x-vercel-ip-country");
	const region = headers.get("x-vercel-ip-country-region");
	const city = headers.get("x-vercel-ip-city");

	if (country) {
		return {
			country,
			region,
			city,
		};
	}

	return {
		country: null,
		region: null,
		city: null,
	};
}

function extractGeoFromCloudflareHeaders(headers: HeaderBag): GeoData {
	const country = headers.get("cf-ipcountry");

	if (country && country !== "XX") {
		return {
			country,
			region: null,
			city: null,
		};
	}

	return {
		country: null,
		region: null,
		city: null,
	};
}

export function extractGeoFromRequest(req: ReqData | null | undefined): GeoData {
	const headers = getHeaders(req);
	const vercelGeo = extractGeoFromVercelHeaders(headers);
	if (vercelGeo.country) {
		return vercelGeo;
	}
	const cfGeo = extractGeoFromCloudflareHeaders(headers);
	if (cfGeo.country) {
		return cfGeo;
	}
	return {
		country: null,
		region: null,
		city: null,
	};
}

export function extractIpAddress(req: ReqData | null | undefined): string | null {
	const headers = getHeaders(req);

	// Priority 1: Vercel's canonical headers (cannot be spoofed by client)
	const vercelIp = headers.get("x-real-ip");
	if (vercelIp) {
		return vercelIp;
	}

	// Priority 2: Cloudflare's canonical header (if using CF as proxy)
	const cfIp = headers.get("cf-connecting-ip");
	if (cfIp) {
		return cfIp;
	}

	// Priority 3: x-forwarded-for (can be spoofed, only use if behind trusted proxy)
	// Note: This should only be used if you control the entire proxy chain
	const forwarded = headers.get("x-forwarded-for");
	if (forwarded) {
		// Take the leftmost IP (original client)
		return forwarded.split(",")[0].trim();
	}

	return null;
}

export function isLocalhost(host: string | null): boolean {
	if (!host) {
		return false;
	}

	const lower = host.toLowerCase();

	return (
		lower === "localhost" ||
		lower.startsWith("localhost:") ||
		lower === "127.0.0.1" ||
		lower.startsWith("127.0.0.1:") ||
		lower === "::1" ||
		lower.startsWith("[::1]") ||
		lower.endsWith(".local") ||
		lower.endsWith(".localhost")
	);
}

export function isPreviewEnvironment(host: string | null): boolean {
	if (!host) {
		return false;
	}

	if (host.includes(".vercel.app") && !host.startsWith("www.")) {
		return true;
	}

	if (host.includes("-preview.") || host.includes(".preview.")) {
		return true;
	}

	if (host.startsWith("preview-") || host.startsWith("staging-")) {
		return true;
	}

	return false;
}
