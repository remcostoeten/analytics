import { describe, test, expect } from "bun:test";
import { validateEventPayload } from "../utilities/validation";

describe("validateEventPayload", () => {
	test("accepts valid minimal payload", () => {
		const payload = {
			projectId: "example.com",
			type: "pageview",
		};

		const result = validateEventPayload(payload);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.projectId).toBe("example.com");
			expect(result.data.type).toBe("pageview");
		}
	});

	test("accepts payload with all fields", () => {
		const payload = {
			projectId: "example.com",
			type: "button_click",
			path: "/signup",
			referrer: "https://google.com",
			origin: "https://example.com",
			host: "example.com",
			ua: "Mozilla/5.0",
			lang: "en-US",
			visitorId: "visitor-123",
			sessionId: "session-456",
			meta: { button: "signup" },
		};

		const result = validateEventPayload(payload);

		expect(result.success).toBe(true);
	});

	test("rejects payload without projectId", () => {
		const payload = {
			type: "pageview",
		};

		const result = validateEventPayload(payload);

		expect(result.success).toBe(false);
	});

	test("defaults type to pageview", () => {
		const payload = {
			projectId: "example.com",
		};

		const result = validateEventPayload(payload);

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.type).toBe("pageview");
		}
	});
});
