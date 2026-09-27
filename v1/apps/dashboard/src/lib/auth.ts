import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_COOKIE = "dashboard_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function getAuthSecret(): string | null {
	return process.env.AUTH_SECRET ?? process.env.GITHUB_CLIENT_SECRET ?? null;
}

function isAuthEnabled(): boolean {
	return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

function sign(payload: string, secret: string): string {
	return createHmac("sha256", secret).update(payload).digest("base64url");
}

function createSessionToken(githubLogin: string): string {
	const secret = getAuthSecret();
	if (!secret) {
		throw new Error("Auth secret is not configured");
	}
	const payload = `${Buffer.from(githubLogin).toString("base64url")}.${Date.now() + SESSION_TTL_MS}`;
	return `${payload}.${sign(payload, secret)}`;
}

function verifySessionToken(token: string | undefined): string | null {
	const secret = getAuthSecret();
	if (!secret || !token) {
		return null;
	}
	const parts = token.split(".");
	if (parts.length !== 3) {
		return null;
	}
	const [encodedLogin, expiry, signature] = parts;
	const expected = Buffer.from(sign(`${encodedLogin}.${expiry}`, secret));
	const actual = Buffer.from(signature);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
		return null;
	}
	if (Number(expiry) < Date.now()) {
		return null;
	}
	return Buffer.from(encodedLogin, "base64url").toString();
}

export { SESSION_COOKIE, SESSION_TTL_MS, isAuthEnabled, createSessionToken, verifySessionToken };
