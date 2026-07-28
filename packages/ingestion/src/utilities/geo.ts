export type GeoData = {
	country: string | null;
	region: string | null;
	city: string | null;
	latitude: number | null;
	longitude: number | null;
	timezone: string | null;
	postalCode: string | null;
	continent: string | null;
};

export function emptyGeo(): GeoData {
	return {
		country: null,
		region: null,
		city: null,
		latitude: null,
		longitude: null,
		timezone: null,
		postalCode: null,
		continent: null,
	};
}

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
	if (!headers) return emptyHeaders();
	return headers;
}

function decodeHeaderValue(value: string | null): string | null {
	if (!value) return null;
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function parseCoordinate(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number.parseFloat(value);
	return Number.isFinite(parsed) ? parsed : null;
}

function extractGeoFromVercelHeaders(headers: HeaderBag): GeoData {
	const country = headers.get("x-vercel-ip-country");
	if (!country) return emptyGeo();

	return {
		country,
		region: decodeHeaderValue(headers.get("x-vercel-ip-country-region")),
		city: decodeHeaderValue(headers.get("x-vercel-ip-city")),
		latitude: parseCoordinate(headers.get("x-vercel-ip-latitude")),
		longitude: parseCoordinate(headers.get("x-vercel-ip-longitude")),
		timezone: headers.get("x-vercel-ip-timezone"),
		postalCode: headers.get("x-vercel-ip-postal-code"),
		continent: headers.get("x-vercel-ip-continent"),
	};
}

function extractGeoFromCloudflareHeaders(headers: HeaderBag): GeoData {
	const country = headers.get("cf-ipcountry");
	if (!country || country === "XX" || country === "T1") return emptyGeo();

	return {
		country,
		region: decodeHeaderValue(headers.get("cf-region-code") ?? headers.get("cf-region")),
		city: decodeHeaderValue(headers.get("cf-ipcity")),
		latitude: parseCoordinate(headers.get("cf-iplatitude")),
		longitude: parseCoordinate(headers.get("cf-iplongitude")),
		timezone: headers.get("cf-timezone"),
		postalCode: headers.get("cf-postal-code"),
		continent: headers.get("cf-ipcontinent"),
	};
}

export function extractGeoFromRequest(req: ReqData | null | undefined): GeoData {
	const headers = getHeaders(req);

	const vercelGeo = extractGeoFromVercelHeaders(headers);
	if (vercelGeo.country) return vercelGeo;

	const cfGeo = extractGeoFromCloudflareHeaders(headers);
	if (cfGeo.country) return cfGeo;

	return emptyGeo();
}

export function extractIpAddress(req: ReqData | null | undefined): string | null {
	const headers = getHeaders(req);

	// When Cloudflare proxies to Vercel, x-real-ip holds the Cloudflare edge
	// node (geolocating every visitor to the edge city, e.g. Amsterdam); only
	// cf-connecting-ip carries the actual client.
	const cfIp = headers.get("cf-connecting-ip");
	if (cfIp) return cfIp;

	const vercelIp = headers.get("x-real-ip");
	if (vercelIp) return vercelIp;

	const forwarded = headers.get("x-forwarded-for");
	if (forwarded) return forwarded.split(",")[0].trim();

	return null;
}

export function isLocalhost(host: string | null): boolean {
	if (!host) return false;

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
	if (!host) return false;

	if (/(-git-|-[a-z0-9]{8,}-)[^.]*\.vercel\.app$/i.test(host)) return true;
	if (host.includes("-preview.") || host.includes(".preview.")) return true;
	if (host.startsWith("preview-") || host.startsWith("staging-")) return true;

	return false;
}

export function getHostFromOrigin(origin: string | null): string | null {
	if (!origin) return null;
	try {
		return new URL(origin).host;
	} catch {
		return null;
	}
}
