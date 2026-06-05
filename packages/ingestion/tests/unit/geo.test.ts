// apps/ingestion/tests/unit/geo.test.ts
import { describe, test, expect } from "bun:test";
import {
	extractGeoFromRequest,
	extractIpAddress,
	isLocalhost,
	isPreviewEnvironment,
} from "../../src/utilities/geo";

describe("extractGeoFromRequest", () => {
	test("extracts from Vercel headers", () => {
		const headers = new Headers({
			"x-vercel-ip-country": "US",
			"x-vercel-ip-country-region": "CA",
			"x-vercel-ip-city": "San Francisco",
		});
		const req = new Request("http://localhost", { headers });

		const geo = extractGeoFromRequest(req);

		expect(geo.country).toBe("US");
		expect(geo.region).toBe("CA");
		expect(geo.city).toBe("San Francisco");
	});

	test("falls back to Cloudflare headers", () => {
		const headers = new Headers({
			"cf-ipcountry": "BR",
		});
		const req = new Request("http://localhost", { headers });

		const geo = extractGeoFromRequest(req);

		expect(geo.country).toBe("BR");
		expect(geo.region).toBeNull();
		expect(geo.city).toBeNull();
	});

	test("ignores Cloudflare XX country code", () => {
		const headers = new Headers({
			"cf-ipcountry": "XX",
		});
		const req = new Request("http://localhost", { headers });

		const geo = extractGeoFromRequest(req);

		expect(geo.country).toBeNull();
		expect(geo.region).toBeNull();
		expect(geo.city).toBeNull();
	});

	test("returns nulls when no geo data", () => {
		const req = new Request("http://localhost");

		const geo = extractGeoFromRequest(req);

		expect(geo.country).toBeNull();
		expect(geo.region).toBeNull();
		expect(geo.city).toBeNull();
	});

	test("prefers Vercel over Cloudflare", () => {
		const headers = new Headers({
			"x-vercel-ip-country": "US",
			"cf-ipcountry": "BR",
		});
		const req = new Request("http://localhost", { headers });

		const geo = extractGeoFromRequest(req);

		expect(geo.country).toBe("US");
	});
});

describe("extractIpAddress", () => {
	test("extracts from x-real-ip header (Vercel)", () => {
		const headers = new Headers({
			"x-real-ip": "192.0.2.1",
		});
		const req = new Request("http://localhost", { headers });

		const ip = extractIpAddress(req);

		expect(ip).toBe("192.0.2.1");
	});

	test("extracts from cf-connecting-ip header (Cloudflare)", () => {
		const headers = new Headers({
			"cf-connecting-ip": "192.0.2.2",
		});
		const req = new Request("http://localhost", { headers });

		const ip = extractIpAddress(req);

		expect(ip).toBe("192.0.2.2");
	});

	test("extracts from x-forwarded-for header", () => {
		const headers = new Headers({
			"x-forwarded-for": "192.0.2.3, 192.0.2.4",
		});
		const req = new Request("http://localhost", { headers });

		const ip = extractIpAddress(req);

		expect(ip).toBe("192.0.2.3");
	});

	test("returns null when no IP headers present", () => {
		const req = new Request("http://localhost");

		const ip = extractIpAddress(req);

		expect(ip).toBeNull();
	});

	test("prefers x-real-ip over other headers", () => {
		const headers = new Headers({
			"x-real-ip": "192.0.2.1",
			"cf-connecting-ip": "192.0.2.2",
			"x-forwarded-for": "192.0.2.3",
		});
		const req = new Request("http://localhost", { headers });

		const ip = extractIpAddress(req);

		expect(ip).toBe("192.0.2.1");
	});
});

describe("isLocalhost", () => {
	test("detects localhost", () => {
		expect(isLocalhost("localhost")).toBe(true);
		expect(isLocalhost("localhost:3000")).toBe(true);
	});

	test("detects 127.0.0.1", () => {
		expect(isLocalhost("127.0.0.1")).toBe(true);
		expect(isLocalhost("127.0.0.1:3000")).toBe(true);
	});

	test("detects ::1 (IPv6)", () => {
		expect(isLocalhost("::1")).toBe(true);
		expect(isLocalhost("[::1]:3000")).toBe(true);
	});

	test("detects .local domains", () => {
		expect(isLocalhost("myapp.local")).toBe(true);
		expect(isLocalhost("test.localhost")).toBe(true);
	});

	test("rejects production domains", () => {
		expect(isLocalhost("example.com")).toBe(false);
		expect(isLocalhost("app.vercel.app")).toBe(false);
		expect(isLocalhost("google.com")).toBe(false);
	});

	test("handles null", () => {
		expect(isLocalhost(null)).toBe(false);
	});
});

describe("isPreviewEnvironment", () => {
	test("detects Vercel preview deployments", () => {
		expect(isPreviewEnvironment("my-app-git-feature.vercel.app")).toBe(true);
		expect(isPreviewEnvironment("preview-abc123.vercel.app")).toBe(true);
	});

	test("does not detect production Vercel with www", () => {
		expect(isPreviewEnvironment("www.example.vercel.app")).toBe(false);
	});

	test("detects custom preview patterns", () => {
		expect(isPreviewEnvironment("feature-preview.example.com")).toBe(true);
		expect(isPreviewEnvironment("app.preview.example.com")).toBe(true);
		expect(isPreviewEnvironment("preview-feature.example.com")).toBe(true);
		expect(isPreviewEnvironment("staging-app.example.com")).toBe(true);
	});

	test("rejects production domains", () => {
		expect(isPreviewEnvironment("example.com")).toBe(false);
		expect(isPreviewEnvironment("app.example.com")).toBe(false);
		expect(isPreviewEnvironment("api.example.com")).toBe(false);
	});

	test("handles null", () => {
		expect(isPreviewEnvironment(null)).toBe(false);
	});
});
