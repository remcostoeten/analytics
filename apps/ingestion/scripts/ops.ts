#!/usr/bin/env bun
import { neon } from "@neondatabase/serverless";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";

const colors = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	cyan: "\x1b[36m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
};

const ingestUrl = process.env.INGEST_URL || "https://ingestion.remcostoeten.nl";
const envPath = ".env.local";
const scripted = process.stdin.isTTY ? [] : readFileSync(0, "utf8").split(/\r?\n/);
const input = process.stdin.isTTY
	? createInterface({
			input: process.stdin,
			output: process.stdout,
		})
	: null;

type Deploy = {
	url: string;
	name: string;
	state: string;
	target: string | null;
	createdAt: number;
	ready?: number;
	meta?: {
		githubCommitMessage?: string;
		githubCommitRef?: string;
		githubCommitSha?: string;
	};
};

type DeployList = {
	deployments?: Deploy[];
};

type EventRow = {
	id: string;
	project_id: string;
	type: string;
	path: string | null;
	ts: string;
	meta: unknown;
};

type TableRow = {
	resume: string | null;
	old_resume: string | null;
	visitor_events: string | null;
	old_visitor_events: string | null;
};

function line(text = ""): void {
	console.log(text);
}

function paint(color: string, text: string): string {
	return `${color}${text}${colors.reset}`;
}

function header(text: string): void {
	line("");
	line(paint(colors.cyan, "═".repeat(72)));
	line(paint(colors.cyan, `  ${colors.bold}${text}${colors.reset}`));
	line(paint(colors.cyan, "═".repeat(72)));
	line("");
}

function ok(text: string): void {
	line(`  ${paint(colors.green, "✓")} ${text}`);
}

function warn(text: string): void {
	line(`  ${paint(colors.yellow, "!")} ${text}`);
}

function fail(text: string): void {
	line(`  ${paint(colors.red, "x")} ${text}`);
}

function dim(text: string): string {
	return paint(colors.dim, text);
}

function readEnv(): void {
	if (!existsSync(envPath)) return;

	const source = readFileSync(envPath, "utf8");
	for (const raw of source.split("\n")) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;

		const index = line.indexOf("=");
		if (index === -1) continue;

		const key = line.slice(0, index);
		const value = line.slice(index + 1).replace(/^["']|["']$/g, "");
		if (!process.env[key]) process.env[key] = value;
	}
}

async function prompt(question: string): Promise<string> {
	if (!input) {
		const answer = scripted.shift() || "";
		line(`${paint(colors.yellow, question)}${answer}`);
		return answer.trim();
	}

	const answer = await input.question(paint(colors.yellow, question));
	return answer.trim();
}

function pause(): Promise<string> {
	return prompt("\n  Press Enter to continue...");
}

function run(command: string[], cwd = process.cwd()): Promise<{ code: number; output: string }> {
	return new Promise(function (resolve) {
		const child = spawn(command[0], command.slice(1), {
			cwd,
			env: process.env,
			stdio: ["ignore", "pipe", "pipe"],
		});

		let output = "";
		child.stdout.on("data", function (data) {
			output += data.toString();
		});
		child.stderr.on("data", function (data) {
			output += data.toString();
		});
		child.on("close", function (code) {
			resolve({ code: code ?? 0, output });
		});
	});
}

function getDb() {
	readEnv();
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error("DATABASE_URL missing. Run option 6 to pull Vercel env first.");
	}
	return neon(url);
}

function formatDate(value: number | string | Date | undefined): string {
	if (!value) return "unknown";
	return new Date(value).toLocaleString();
}

function formatJson(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

function parseDeploys(output: string): Deploy[] {
	const data = JSON.parse(output) as DeployList;
	if (!Array.isArray(data.deployments)) return [];
	return data.deployments;
}

async function deployStatus(): Promise<void> {
	header("Deploy Status");

	const result = await run(["vercel", "ls", "ingestion", "--format=json"]);
	if (result.code !== 0) {
		fail("Could not read Vercel deployments.");
		line(result.output.trim());
		return;
	}

	const deploys = parseDeploys(result.output).slice(0, 5);
	if (deploys.length === 0) {
		warn("No deployments found.");
		return;
	}

	for (const deploy of deploys) {
		const sha = deploy.meta?.githubCommitSha?.slice(0, 7) || "unknown";
		line(`  ${paint(colors.bold, deploy.state.padEnd(8))} ${deploy.url}`);
		line(`  ${dim("target")} ${deploy.target || "preview"}`);
		line(`  ${dim("branch")} ${deploy.meta?.githubCommitRef || "unknown"}`);
		line(`  ${dim("commit")} ${sha} ${deploy.meta?.githubCommitMessage || ""}`);
		line(`  ${dim("ready")}  ${formatDate(deploy.ready || deploy.createdAt)}`);
		line("");
	}
}

async function health(): Promise<void> {
	header("Health Check");

	const response = await fetch(`${ingestUrl}/health`);
	const body = await response.json();

	if (response.ok) {
		ok(`HTTP ${response.status}`);
	} else {
		fail(`HTTP ${response.status}`);
	}
	line(formatJson(body));
}

async function smoke(): Promise<void> {
	header("Ingest Smoke Test");

	const projectId = (await prompt("  projectId [verify]: ")) || "verify";
	const type = (await prompt("  event type [ops_verify]: ")) || "ops_verify";
	const path = (await prompt("  path [/ops]: ")) || "/ops";
	const origin =
		(await prompt("  origin [https://remcostoeten.nl]: ")) || "https://remcostoeten.nl";

	const payload = {
		projectId,
		type,
		path,
		visitorId: `ops-${Date.now()}`,
		sessionId: `ops-${Date.now()}`,
		meta: {
			source: "ops-tool",
			checkedAt: new Date().toISOString(),
		},
	};

	const response = await fetch(`${ingestUrl}/ingest`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Origin: origin,
		},
		body: JSON.stringify(payload),
	});

	const body = await response.json();
	if (response.ok) {
		ok(`HTTP ${response.status}`);
	} else {
		fail(`HTTP ${response.status}`);
	}
	line(formatJson(body));
}

async function recent(): Promise<void> {
	header("Recent Events");

	const limitRaw = (await prompt("  limit [10]: ")) || "10";
	const limit = Math.min(Math.max(Number(limitRaw) || 10, 1), 50);
	const sql = getDb();
	const rows = await sql<EventRow[]>(
		"select id::text, project_id, type, path, ts::text, meta from events order by ts desc limit $1",
		[limit],
	);

	for (const row of rows) {
		line(`  ${paint(colors.bold, row.type)} ${row.project_id} ${row.path || ""}`);
		line(`  ${dim(row.ts)} ${dim(`#${row.id}`)}`);
		if (row.meta) line(`  ${dim(formatJson(row.meta).replace(/\n/g, "\n  "))}`);
		line("");
	}
}

async function tables(): Promise<void> {
	header("Legacy Table Check");

	const sql = getDb();
	const rows = await sql<TableRow[]>(
		"select to_regclass($1) as resume, to_regclass($2) as old_resume, to_regclass($3) as visitor_events, to_regclass($4) as old_visitor_events",
		["public.resume", "public.old_resume", "public.visitor_events", "public.old_visitor_events"],
	);
	const row = rows[0];

	if (!row.resume && row.old_resume) ok("resume archived as old_resume");
	else warn(`resume state: ${row.resume || "missing"}, old_resume: ${row.old_resume || "missing"}`);

	if (!row.visitor_events && row.old_visitor_events)
		ok("visitor_events archived as old_visitor_events");
	else {
		warn(
			`visitor_events state: ${row.visitor_events || "missing"}, old_visitor_events: ${
				row.old_visitor_events || "missing"
			}`,
		);
	}
}

async function query(): Promise<void> {
	header("Event Query");

	const projectId = await prompt("  projectId filter [all]: ");
	const type = await prompt("  type filter [all]: ");
	const limitRaw = (await prompt("  limit [10]: ")) || "10";
	const limit = Math.min(Math.max(Number(limitRaw) || 10, 1), 50);
	const sql = getDb();

	const rows = await sql<EventRow[]>(
		`
		select id::text, project_id, type, path, ts::text, meta
		from events
		where ($1 = '' or project_id = $1)
		  and ($2 = '' or type = $2)
		order by ts desc
		limit $3
		`,
		[projectId, type, limit],
	);

	if (rows.length === 0) {
		warn("No matching events.");
		return;
	}

	for (const row of rows) {
		line(`  ${paint(colors.bold, row.type)} ${row.project_id} ${row.path || ""}`);
		line(`  ${dim(row.ts)} ${dim(`#${row.id}`)}`);
		line("");
	}
}

async function pullEnv(): Promise<void> {
	header("Pull Vercel Env");

	const result = await run([
		"vercel",
		"env",
		"pull",
		".env.local",
		"--environment=production",
		"--yes",
	]);

	if (result.code === 0) {
		ok("Pulled production env into apps/ingestion/.env.local");
		readEnv();
		if (process.env.DATABASE_URL) ok("DATABASE_URL is available");
		else warn("DATABASE_URL was not found in pulled env");
		return;
	}

	fail("Could not pull Vercel env.");
	line(result.output.trim());
}

async function menu(): Promise<void> {
	for (;;) {
		console.clear();
		header("Analytics Ops");
		line(`  ${colors.cyan}1.${colors.reset} Vercel deploy status`);
		line(`  ${colors.cyan}2.${colors.reset} Health check`);
		line(`  ${colors.cyan}3.${colors.reset} Send ingest smoke event`);
		line(`  ${colors.cyan}4.${colors.reset} Recent events`);
		line(`  ${colors.cyan}5.${colors.reset} Legacy table check`);
		line(`  ${colors.cyan}6.${colors.reset} Pull Vercel env`);
		line(`  ${colors.cyan}7.${colors.reset} Query events`);
		line(`  ${colors.cyan}0.${colors.reset} Exit`);

		const choice = await prompt("\n  Select an option: ");

		try {
			if (choice === "1") await deployStatus();
			else if (choice === "2") await health();
			else if (choice === "3") await smoke();
			else if (choice === "4") await recent();
			else if (choice === "5") await tables();
			else if (choice === "6") await pullEnv();
			else if (choice === "7") await query();
			else if (choice === "0") break;
			else warn("Unknown option.");
		} catch (error) {
			fail(error instanceof Error ? error.message : "Unknown error");
		}

		await pause();
	}
}

readEnv();
try {
	await menu();
} finally {
	input?.close();
}
