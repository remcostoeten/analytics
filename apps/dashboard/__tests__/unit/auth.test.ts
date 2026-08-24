import { afterEach, describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { createSessionToken, isAuthEnabled, verifySessionToken } from "@/lib/auth";

const originalSecret = process.env.AUTH_SECRET;
const originalClientId = process.env.GITHUB_CLIENT_ID;
const originalClientSecret = process.env.GITHUB_CLIENT_SECRET;

afterEach(function () {
	setEnv("AUTH_SECRET", originalSecret);
	setEnv("GITHUB_CLIENT_ID", originalClientId);
	setEnv("GITHUB_CLIENT_SECRET", originalClientSecret);
});

describe("auth configuration", function () {
	test("requires both GitHub credentials", function () {
		process.env.GITHUB_CLIENT_ID = "client";
		delete process.env.GITHUB_CLIENT_SECRET;
		expect(isAuthEnabled()).toBe(false);

		process.env.GITHUB_CLIENT_SECRET = "secret";
		expect(isAuthEnabled()).toBe(true);
	});
});

describe("session tokens", function () {
	test("creates and verifies a token", function () {
		process.env.AUTH_SECRET = "test-secret";
		const token = createSessionToken("remco");

		expect(verifySessionToken(token)).toBe("remco");
	});

	test("rejects malformed and tampered tokens", function () {
		process.env.AUTH_SECRET = "test-secret";
		const token = createSessionToken("remco");

		expect(verifySessionToken("invalid")).toBeNull();
		expect(verifySessionToken(`${token}x`)).toBeNull();
	});

	test("rejects expired tokens", function () {
		process.env.AUTH_SECRET = "test-secret";
		const payload = `${Buffer.from("remco").toString("base64url")}.${Date.now() - 1}`;
		const signature = createHmac("sha256", "test-secret").update(payload).digest("base64url");

		expect(verifySessionToken(`${payload}.${signature}`)).toBeNull();
	});

	test("fails creation without a secret", function () {
		delete process.env.AUTH_SECRET;
		delete process.env.GITHUB_CLIENT_SECRET;

		expect(function () {
			createSessionToken("remco");
		}).toThrow("Auth secret is not configured");
	});
});

function setEnv(name: string, value: string | undefined): void {
	if (value === undefined) {
		delete process.env[name];
		return;
	}
	process.env[name] = value;
}
