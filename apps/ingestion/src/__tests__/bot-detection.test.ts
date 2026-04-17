// apps/ingestion/src/__tests__/bot-detection.test.ts
import { describe, test, expect } from "bun:test";
import { isBotUserAgent, detectBot, classifyDevice } from "../utilities/bot-detection";

describe("isBotUserAgent", () => {
	test("detects googlebot", () => {
		const ua = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects bingbot", () => {
		const ua = "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects headless chrome", () => {
		const ua = "HeadlessChrome/91.0.4472.124";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects puppeteer", () => {
		const ua =
			"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/91.0.4472.124 Safari/537.36 Puppeteer";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects selenium", () => {
		const ua =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Selenium";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects curl", () => {
		const ua = "curl/7.64.1";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects wget", () => {
		const ua = "Wget/1.20.3 (linux-gnu)";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects python-requests", () => {
		const ua = "python-requests/2.28.0";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects GPTBot", () => {
		const ua =
			"Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.0; +https://openai.com/gptbot)";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects ClaudeBot", () => {
		const ua =
			"Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ClaudeBot/1.0; +claudebot@anthropic.com)";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects facebookexternalhit", () => {
		const ua = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects twitterbot", () => {
		const ua = "Twitterbot/1.0";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects linkedinbot", () => {
		const ua =
			"LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects ahrefsbot", () => {
		const ua = "Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects semrushbot", () => {
		const ua = "Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("detects uptimerobot", () => {
		const ua = "Mozilla/5.0+(compatible; UptimeRobot/2.0; http://www.uptimerobot.com/)";
		expect(isBotUserAgent(ua)).toBe(true);
	});

	test("allows real browsers - Chrome", () => {
		const ua =
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
		expect(isBotUserAgent(ua)).toBe(false);
	});

	test("allows real browsers - Firefox", () => {
		const ua =
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0";
		expect(isBotUserAgent(ua)).toBe(false);
	});

	test("allows real browsers - Safari", () => {
		const ua =
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15";
		expect(isBotUserAgent(ua)).toBe(false);
	});

	test("allows real browsers - Edge", () => {
		const ua =
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
		expect(isBotUserAgent(ua)).toBe(false);
	});

	test("handles null user agent", () => {
		expect(isBotUserAgent(null)).toBe(false);
	});

	test("handles empty string", () => {
		expect(isBotUserAgent("")).toBe(false);
	});
});

describe("detectBot", () => {
	test("detects via vercel bot header", () => {
		const headers = new Headers({
			"x-vercel-bot": "1",
			"user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
		});
		const req = new Request("http://localhost", { headers });

		const result = detectBot(req);

		expect(result.isBot).toBe(true);
		expect(result.reason).toBe("vercel-bot-header");
		expect(result.confidence).toBe("high");
	});

	test("detects via user agent", () => {
		const headers = new Headers({
			"user-agent": "Googlebot/2.1",
		});
		const req = new Request("http://localhost", { headers });

		const result = detectBot(req);

		expect(result.isBot).toBe(true);
		expect(result.reason).toBe("bot-user-agent");
		expect(result.confidence).toBe("high");
	});

	test("detects missing browser headers for navigation requests", () => {
		const headers = new Headers({
			"user-agent": "SomeCustomUA/1.0",
			accept: "text/html,application/xhtml+xml",
			"sec-fetch-mode": "navigate",
		});
		const req = new Request("http://localhost", { headers });

		const result = detectBot(req);

		expect(result.isBot).toBe(true);
		expect(result.reason).toBe("invalid-headers");
		expect(result.confidence).toBe("medium");
	});

	test("allows valid browser request", () => {
		const headers = new Headers({
			"user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
			accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"accept-language": "en-US,en;q=0.9",
		});
		const req = new Request("http://localhost", { headers });

		const result = detectBot(req);

		expect(result.isBot).toBe(false);
		expect(result.reason).toBeNull();
		expect(result.confidence).toBe("low");
	});

	test("rejects request without accept header", () => {
		const headers = new Headers({
			"user-agent": "Mozilla/5.0",
			"accept-language": "en-US",
			"sec-fetch-mode": "navigate",
		});
		const req = new Request("http://localhost", { headers });

		const result = detectBot(req);

		expect(result.isBot).toBe(true);
		expect(result.confidence).toBe("medium");
	});

	test("rejects request with accept header not containing text/html", () => {
		const headers = new Headers({
			"user-agent": "Mozilla/5.0",
			accept: "application/json",
			"accept-language": "en-US",
			"sec-fetch-mode": "navigate",
		});
		const req = new Request("http://localhost", { headers });

		const result = detectBot(req);

		expect(result.isBot).toBe(true);
		expect(result.confidence).toBe("medium");
	});

	test("allows sdk post requests without navigation headers", () => {
		const headers = new Headers({
			"user-agent":
				"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36",
			"content-type": "application/json",
			accept: "*/*",
		});
		const req = new Request("http://localhost/ingest", {
			method: "POST",
			headers,
		});

		const result = detectBot(req);

		expect(result.isBot).toBe(false);
		expect(result.reason).toBeNull();
		expect(result.confidence).toBe("low");
	});
});

describe("classifyDevice", () => {
	test("classifies bot regardless of UA", () => {
		const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
		expect(classifyDevice(ua, true)).toBe("bot");
	});

	test("classifies mobile devices - iPhone", () => {
		const ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X)";
		expect(classifyDevice(ua, false)).toBe("mobile");
	});

	test("classifies mobile devices - Android", () => {
		const ua = "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Mobile";
		expect(classifyDevice(ua, false)).toBe("mobile");
	});

	test("classifies tablets - iPad", () => {
		const ua = "Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X)";
		expect(classifyDevice(ua, false)).toBe("tablet");
	});

	test("classifies tablets - Android tablet", () => {
		const ua =
			"Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Tablet";
		expect(classifyDevice(ua, false)).toBe("tablet");
	});

	test("classifies desktop - macOS", () => {
		const ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
		expect(classifyDevice(ua, false)).toBe("desktop");
	});

	test("classifies desktop - Windows", () => {
		const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
		expect(classifyDevice(ua, false)).toBe("desktop");
	});

	test("classifies desktop - Linux", () => {
		const ua = "Mozilla/5.0 (X11; Linux x86_64)";
		expect(classifyDevice(ua, false)).toBe("desktop");
	});

	test("returns unknown for null UA", () => {
		expect(classifyDevice(null, false)).toBe("unknown");
	});

	test("returns unknown for empty UA", () => {
		expect(classifyDevice("", false)).toBe("unknown");
	});

	test("returns unknown for unrecognized UA", () => {
		const ua = "SomeWeirdDevice/1.0";
		expect(classifyDevice(ua, false)).toBe("unknown");
	});
});
