import { timingSafeEqual } from "node:crypto";

export function extractBearerToken(authHeader: string | null | undefined): string | null {
	if (!authHeader?.startsWith("Bearer ")) return null;
	const token = authHeader.slice(7).trim();
	return token.length > 0 ? token : null;
}

function secretsMatch(expected: string, provided: string): boolean {
	const expectedBuffer = Buffer.from(expected);
	const providedBuffer = Buffer.from(provided);
	if (expectedBuffer.length !== providedBuffer.length) return false;
	return timingSafeEqual(expectedBuffer, providedBuffer);
}

export type IngestAuthResult =
	| { allowed: true }
	| { allowed: false; status: 401 | 403; error: string };

export function authorizeIngestRequest(
	origin: string | null,
	authHeader: string | null | undefined,
	config: {
		originAllowed: (origin: string | null) => boolean;
		ingestSecret: string | undefined;
	},
): IngestAuthResult {
	const token = extractBearerToken(authHeader);

	if (token) {
		if (!config.ingestSecret) {
			return { allowed: false, status: 401, error: "Unauthorized" };
		}
		if (!secretsMatch(config.ingestSecret, token)) {
			return { allowed: false, status: 401, error: "Unauthorized" };
		}
		return { allowed: true };
	}

	if (config.ingestSecret && !origin) {
		return { allowed: false, status: 403, error: "Forbidden" };
	}

	if (!config.originAllowed(origin)) {
		return { allowed: false, status: 403, error: "Origin not allowed" };
	}

	return { allowed: true };
}
