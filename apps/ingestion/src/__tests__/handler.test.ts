import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { IncomingMessage, ServerResponse } from "http";

let lastRequest: Request | null = null;
let shouldThrow = false;

mock.module("../app.js", () => ({
	app: {
		async fetch(request: Request) {
			lastRequest = request;

			if (shouldThrow) {
				throw new Error("adapter failed");
			}

			return new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: {
					"Access-Control-Allow-Origin": "https://example.com",
					"Content-Type": "application/json",
				},
			});
		},
	},
}));

const { default: handler } = await import("../handler.js");

type MockRequest = IncomingMessage & AsyncIterable<string>;

type MockResponse = ServerResponse & {
	body?: string;
	headers: Map<string, string>;
};

function createRequest(headers: Record<string, string | string[] | undefined>): MockRequest {
	return {
		method: "POST",
		url: "/ingest",
		headers,
		async *[Symbol.asyncIterator]() {
			yield JSON.stringify({ ok: true });
		},
	} as MockRequest;
}

function createResponse(): MockResponse {
	const headers = new Map<string, string>();

	return {
		headers,
		statusCode: 200,
		setHeader(name: string, value: string) {
			headers.set(name.toLowerCase(), value);
			return this;
		},
		end(body?: string) {
			this.body = body;
			return this;
		},
	} as MockResponse;
}

beforeEach(function resetState() {
	lastRequest = null;
	shouldThrow = false;
});

afterEach(function resetThrow() {
	shouldThrow = false;
});

describe("handler", () => {
	test("normalizes node headers before building the request", async () => {
		const req = createRequest({
			host: "ingestion-beryl.vercel.app",
			origin: "https://example.com",
			"x-forwarded-proto": "https",
			"x-test": ["one", "two"],
			"x-empty": undefined,
			"content-type": "application/json",
		});
		const res = createResponse();

		await handler(req, res);

		expect(res.statusCode).toBe(200);
		expect(lastRequest).not.toBeNull();
		expect(lastRequest?.headers.get("x-test")).toBe("one, two");
		expect(lastRequest?.headers.get("x-empty")).toBeNull();
	});

	test("keeps cors headers on adapter failures", async () => {
		shouldThrow = true;

		const req = createRequest({
			host: "ingestion-beryl.vercel.app",
			origin: "https://example.com",
			"x-forwarded-proto": "https",
			"content-type": "application/json",
		});
		const res = createResponse();

		await handler(req, res);

		expect(res.statusCode).toBe(500);
		expect(res.headers.get("access-control-allow-origin")).toBe("https://example.com");
		expect(res.headers.get("access-control-allow-methods")).toBe("GET,POST,OPTIONS");
		expect(res.headers.get("access-control-allow-headers")).toBe("Content-Type,X-Requested-With");
		expect(res.headers.get("vary")).toBe("Origin");
		expect(res.body).toContain("adapter failed");
	});
});
