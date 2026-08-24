const INSECURE_DEFAULT_SECRET = "default-secret-change-me";
const MIN_SECRET_LENGTH = 32;

let devWarningEmitted = false;

function isProduction(): boolean {
	return process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
}

/**
 * Returns a human-readable reason the configured IP_HASH_SECRET is unusable,
 * or null when the secret is safe to derive IP hashes from.
 */
export function getIpHashSecretProblem(): string | null {
	const secret = process.env.IP_HASH_SECRET;

	if (!secret) {
		return "IP_HASH_SECRET is not set";
	}

	if (secret === INSECURE_DEFAULT_SECRET) {
		return `IP_HASH_SECRET is still the placeholder value "${INSECURE_DEFAULT_SECRET}"`;
	}

	if (secret.length < MIN_SECRET_LENGTH) {
		return `IP_HASH_SECRET is ${secret.length} characters; at least ${MIN_SECRET_LENGTH} are required`;
	}

	return null;
}

export function validateIpHashSecret(): boolean {
	return getIpHashSecretProblem() === null;
}

/**
 * Throws in production when IP_HASH_SECRET is missing, placeholder, or too short.
 * A guessable secret makes the stored ip_hash column reversible by brute-forcing
 * the address space, so ingestion must fail closed rather than persist it.
 */
export function assertIpHashSecret(): void {
	const problem = getIpHashSecretProblem();

	if (!problem) return;

	if (isProduction()) {
		throw new Error(
			`Refusing to start ingestion: ${problem}. ` +
				`Stored IP hashes would be reversible without a strong secret. ` +
				`Generate one with: openssl rand -hex 32`,
		);
	}

	if (!devWarningEmitted) {
		devWarningEmitted = true;
		console.warn(
			`[analytics] ${problem}. Falling back to an insecure development secret. ` +
				`Set IP_HASH_SECRET before deploying (openssl rand -hex 32).`,
		);
	}
}

function getSecret(): string {
	assertIpHashSecret();
	return process.env.IP_HASH_SECRET || INSECURE_DEFAULT_SECRET;
}

async function sha256Hex(input: string): Promise<string> {
	const msgUint8 = new TextEncoder().encode(input);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);

	return Array.from(new Uint8Array(hashBuffer))
		.map(function (b) {
			return b.toString(16).padStart(2, "0");
		})
		.join("");
}

async function getDailySalt(): Promise<string> {
	const today = new Date().toISOString().split("T")[0];

	return sha256Hex(getSecret() + today);
}

export async function hashIp(ip: string | null): Promise<string | null> {
	if (!ip) return null;

	const salt = await getDailySalt();

	return sha256Hex(ip + salt);
}
