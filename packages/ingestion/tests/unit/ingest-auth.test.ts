import { describe, test, expect } from "bun:test";
import { authorizeIngestRequest, extractBearerToken } from "../../src/utilities/ingest-auth";

describe("extractBearerToken", () => {
	test("parses bearer token", () => {
		expect(extractBearerToken("Bearer secret-token")).toBe("secret-token");
	});

	test("returns null for missing header", () => {
		expect(extractBearerToken(null)).toBeNull();
	});
});

describe("authorizeIngestRequest", () => {
	const originAllowed = (origin: string | null) => origin === "https://allowed.example";

	test("allows valid bearer token", () => {
		const result = authorizeIngestRequest(null, "Bearer my-secret", {
			originAllowed,
			ingestSecret: "my-secret",
		});

		expect(result.allowed).toBe(true);
	});

	test("rejects invalid bearer token", () => {
		const result = authorizeIngestRequest(null, "Bearer wrong", {
			originAllowed,
			ingestSecret: "my-secret",
		});

		expect(result).toEqual({ allowed: false, status: 401, error: "Unauthorized" });
	});

	test("rejects bearer when secret is not configured", () => {
		const result = authorizeIngestRequest(null, "Bearer my-secret", {
			originAllowed,
			ingestSecret: undefined,
		});

		expect(result).toEqual({ allowed: false, status: 401, error: "Unauthorized" });
	});

	test("allows browser origin on allowlist", () => {
		const result = authorizeIngestRequest("https://allowed.example", null, {
			originAllowed,
			ingestSecret: "my-secret",
		});

		expect(result.allowed).toBe(true);
	});

	test("rejects server requests without bearer when secret is configured", () => {
		const result = authorizeIngestRequest(null, null, {
			originAllowed,
			ingestSecret: "my-secret",
		});

		expect(result).toEqual({ allowed: false, status: 403, error: "Forbidden" });
	});

	test("rejects blocked browser origin", () => {
		const result = authorizeIngestRequest("https://blocked.example", null, {
			originAllowed,
			ingestSecret: undefined,
		});

		expect(result).toEqual({ allowed: false, status: 403, error: "Origin not allowed" });
	});
});
