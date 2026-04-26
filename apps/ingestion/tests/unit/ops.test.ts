import { describe, expect, test } from "bun:test";
import {
	fuzzyFilter,
	isConfirmed,
	loadConfig,
	parseArgs,
	parseEnv,
	presets,
} from "../../scripts/ops";

describe("ops config", () => {
	test("parses cli args", () => {
		const args = parseArgs([
			"--target",
			"local",
			"--url",
			"http://127.0.0.1:3000",
			"--cmd",
			"health",
			"--json",
		]);

		expect(args.target).toBe("custom");
		expect(args.url).toBe("http://127.0.0.1:3000");
		expect(args.cmd).toBe("health");
		expect(args.json).toBe(true);
	});

	test("parses env files", () => {
		const values = parseEnv(`
DATABASE_URL="postgres://example"
ADMIN_SECRET='secret'
INGEST_URL=https://ingest.example.com
`);

		expect(values.DATABASE_URL).toBe("postgres://example");
		expect(values.ADMIN_SECRET).toBe("secret");
		expect(values.INGEST_URL).toBe("https://ingest.example.com");
	});

	test("reports missing env state", () => {
		const beforeDatabase = process.env.DATABASE_URL;
		const beforeAdmin = process.env.ADMIN_SECRET;
		delete process.env.DATABASE_URL;
		delete process.env.ADMIN_SECRET;

		const config = loadConfig(parseArgs(["--target", "local"]), "/tmp/no-analytics-env");

		if (beforeDatabase === undefined) delete process.env.DATABASE_URL;
		else process.env.DATABASE_URL = beforeDatabase;
		if (beforeAdmin === undefined) delete process.env.ADMIN_SECRET;
		else process.env.ADMIN_SECRET = beforeAdmin;

		expect(config.ingestUrl).toBe("http://localhost:3000");
		expect(config.missing).toContain("DATABASE_URL");
		expect(config.missing).toContain("ADMIN_SECRET");
	});
});

describe("ops presets", () => {
	test("builds recent event query values", () => {
		const preset = presets.find(function (entry) {
			return entry.id === "recent";
		});

		expect(
			preset?.values({ projectId: "site", type: "pageview", path: "/", limit: "500" }),
		).toEqual(["site", "pageview", "/", 50]);
	});

	test("contains smoke verification support presets", () => {
		const ids = presets.map(function (preset) {
			return preset.id;
		});

		expect(ids).toContain("journey");
		expect(ids).toContain("session");
		expect(ids).toContain("bots");
		expect(ids).toContain("internal");
	});
});

describe("ops fuzzy search", () => {
	test("filters choices by fuzzy match", () => {
		const matches = fuzzyFilter(
			[
				{ label: "Recent events", desc: "Latest events", value: "recent" },
				{ label: "Visitor journey", desc: "Timeline", value: "journey" },
				{ label: "Bot traffic", desc: "Crawlers", value: "bots" },
			],
			"vj",
		);

		expect(matches[0].value).toBe("journey");
	});
});

describe("ops confirmations", () => {
	test("requires exact yes for destructive actions", () => {
		expect(isConfirmed("yes")).toBe(true);
		expect(isConfirmed("y")).toBe(false);
		expect(isConfirmed("YES")).toBe(false);
	});
});
