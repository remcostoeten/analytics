import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import {
	trackServer,
	trackServerEvent,
	trackServerError,
	createServerTrack,
} from "../src/server/index";

describe("trackServer", () => {
	let fetchMock: ReturnType<typeof mock>;

	beforeEach(() => {
		process.env.ANALYTICS_URL = "https://analytics-api.example.com";
		process.env.INGEST_SECRET = "test-secret-min-32-characters-long";
		fetchMock = mock(() =>
			Promise.resolve(
				new Response(JSON.stringify({ ok: true }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				}),
			),
		);
		global.fetch = fetchMock as typeof fetch;
	});

	afterEach(() => {
		delete process.env.ANALYTICS_URL;
		delete process.env.INGEST_SECRET;
	});

	test("posts to /e with bearer token from env", async () => {
		const result = await trackServer(
			"event",
			{ projectId: "my-app", path: "/api/signup" },
			{ eventName: "user_created" },
		);

		expect(result.ok).toBe(true);
		expect(result.status).toBe(200);
		expect(fetchMock).toHaveBeenCalledTimes(1);

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://analytics-api.example.com/e");
		expect(init.method).toBe("POST");
		expect((init.headers as Record<string, string>).Authorization).toBe(
			"Bearer test-secret-min-32-characters-long",
		);

		const payload = JSON.parse(init.body as string);
		expect(payload.projectId).toBe("my-app");
		expect(payload.path).toBe("/api/signup");
		expect(payload.meta.eventName).toBe("user_created");
		expect(payload.meta.source).toBe("server");
		expect(payload.ua).toBe("remco-analytics-server/1.0");
	});

	test("uses ingestUrl and secret from options", async () => {
		await trackServer(
			"event",
			{
				projectId: "my-app",
				ingestUrl: "https://custom.example.com/",
				secret: "custom-secret",
			},
			{ eventName: "done" },
		);

		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
		expect(url).toBe("https://custom.example.com/e");
		expect((init.headers as Record<string, string>).Authorization).toBe("Bearer custom-secret");
	});

	test("returns error when ingest URL is missing", async () => {
		delete process.env.ANALYTICS_URL;

		const result = await trackServer("event", { projectId: "my-app" }, { eventName: "x" });

		expect(result.ok).toBe(false);
		expect(result.status).toBe(0);
		expect(result.error).toContain("Missing ingest URL");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test("surfaces ingest rejection", async () => {
		fetchMock = mock(() =>
			Promise.resolve(
				new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
					status: 401,
				}),
			),
		);
		global.fetch = fetchMock as typeof fetch;

		const result = await trackServer("event", { projectId: "my-app" }, { eventName: "x" });

		expect(result.ok).toBe(false);
		expect(result.status).toBe(401);
		expect(result.error).toBe("Unauthorized");
	});
});

describe("trackServerEvent", () => {
	let fetchMock: ReturnType<typeof mock>;

	beforeEach(() => {
		process.env.ANALYTICS_URL = "https://analytics-api.example.com";
		fetchMock = mock(() =>
			Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
		);
		global.fetch = fetchMock as typeof fetch;
	});

	afterEach(() => {
		delete process.env.ANALYTICS_URL;
	});

	test("wraps event name in meta", async () => {
		await trackServerEvent("signup_completed", { plan: "pro" }, { projectId: "my-app" });

		const init = fetchMock.mock.calls[0][1] as RequestInit;
		const payload = JSON.parse(init.body as string);
		expect(payload.type).toBe("event");
		expect(payload.meta.eventName).toBe("signup_completed");
		expect(payload.meta.plan).toBe("pro");
	});
});

describe("trackServerError", () => {
	let fetchMock: ReturnType<typeof mock>;

	beforeEach(() => {
		process.env.ANALYTICS_URL = "https://analytics-api.example.com";
		fetchMock = mock(() =>
			Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
		);
		global.fetch = fetchMock as typeof fetch;
	});

	afterEach(() => {
		delete process.env.ANALYTICS_URL;
	});

	test("tracks error payload", async () => {
		const error = new Error("Webhook failed");
		await trackServerError(error, { route: "signup" }, { projectId: "my-app" });

		const init = fetchMock.mock.calls[0][1] as RequestInit;
		const payload = JSON.parse(init.body as string);
		expect(payload.type).toBe("error");
		expect(payload.meta.message).toBe("Webhook failed");
		expect(payload.meta.route).toBe("signup");
	});
});

describe("createServerTrack", () => {
	let fetchMock: ReturnType<typeof mock>;

	beforeEach(() => {
		process.env.ANALYTICS_URL = "https://analytics-api.example.com";
		fetchMock = mock(() =>
			Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
		);
		global.fetch = fetchMock as typeof fetch;
	});

	afterEach(() => {
		delete process.env.ANALYTICS_URL;
	});

	test("reuses default projectId", async () => {
		const analytics = createServerTrack({ projectId: "my-app" });
		await analytics.trackEvent("done");

		const init = fetchMock.mock.calls[0][1] as RequestInit;
		const payload = JSON.parse(init.body as string);
		expect(payload.projectId).toBe("my-app");
	});
});
