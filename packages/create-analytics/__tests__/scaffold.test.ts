import { describe, test, expect, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { scaffoldProject } from "../src/scaffold";
import { buildFiles } from "../src/templates";

describe("create-analytics scaffold", () => {
	let tempRoot = "";

	afterEach(async function () {
		if (tempRoot) await rm(tempRoot, { recursive: true, force: true });
	});

	test("tier separate creates web and analytics-api", async () => {
		tempRoot = await mkdtemp(join(tmpdir(), "create-analytics-"));
		const targetDir = join(tempRoot, "demo");

		const files = await scaffoldProject({
			projectName: "demo",
			projectId: "demo",
			tier: "separate",
			targetDir,
		});

		expect(files).toContain("apps/web/app/layout.tsx");
		expect(files).toContain("apps/analytics-api/api/index.ts");

		const layout = await readFile(join(targetDir, "apps/web/app/layout.tsx"), "utf8");
		expect(layout).toContain('projectId="demo"');
		expect(layout).toContain("@remcostoeten/analytics");

		const handler = await readFile(join(targetDir, "apps/analytics-api/api/index.ts"), "utf8");
		expect(handler).toContain("@remcostoeten/ingestion/vercel");
	});

	test("tier colocated creates ingest routes", async () => {
		tempRoot = await mkdtemp(join(tmpdir(), "create-analytics-"));
		const targetDir = join(tempRoot, "colocated");

		await scaffoldProject({
			projectName: "colocated",
			projectId: "colocated",
			tier: "colocated",
			targetDir,
		});

		const route = await readFile(join(targetDir, "app/e/route.ts"), "utf8");
		expect(route).toContain("@remcostoeten/ingestion");
		expect(route).toContain("app.fetch");
	});

	test("tier sdk-only has no ingestion deps in layout path", () => {
		const files = buildFiles({
			projectName: "sdk",
			projectId: "sdk",
			tier: "sdk-only",
			targetDir: "/tmp/sdk",
		});

		expect(files.some((f) => f.path.includes("analytics-api"))).toBe(false);
		expect(files.some((f) => f.path === "app/layout.tsx")).toBe(true);
	});
});
