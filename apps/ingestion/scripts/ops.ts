#!/usr/bin/env bun
import { neon } from "@neondatabase/serverless";
import { existsSync, readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { stdin as input, stdout as output } from "node:process";

const reset = "\x1b[0m";
const colors = {
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	green: "\x1b[32m",
	cyan: "\x1b[36m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	invert: "\x1b[7m",
};

const defaultUrl = "https://ingestion.remcostoeten.nl";
const envPath = "apps/ingestion/.env.local";
const localEnvPath = ".env.local";
const maxRows = 50;

type Target = "production" | "local" | "custom";

type Config = {
	target: Target;
	ingestUrl: string;
	databaseUrl: string | null;
	adminSecret: string | null;
	envPath: string | null;
	envLoaded: boolean;
	missing: string[];
};

type Args = {
	target: Target;
	url: string | null;
	cmd: string | null;
	json: boolean;
	help: boolean;
};

type RunResult = {
	code: number;
	output: string;
};

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

type EventRow = {
	id: string;
	project_id: string;
	type: string;
	path: string | null;
	referrer: string | null;
	origin: string | null;
	host: string | null;
	device_type: string | null;
	visitor_id: string | null;
	session_id: string | null;
	country: string | null;
	city: string | null;
	is_localhost: boolean | null;
	ts: string;
	meta: unknown;
};

type VisitorRow = {
	id: string;
	fingerprint: string;
	first_seen: string;
	last_seen: string;
	visit_count: number;
	is_internal: boolean;
	device_type: string | null;
	browser: string | null;
	os: string | null;
	country: string | null;
	city: string | null;
};

type Choice = {
	label: string;
	desc: string;
	value: string;
};

type Preset = {
	id: string;
	label: string;
	desc: string;
	params: string[];
	sql: string;
	values: (input: Record<string, string>) => unknown[];
};

type Screen = {
	title: string;
	items: Choice[];
	parent: string | null;
};

type AppState = {
	config: Config;
	screen: string;
	cursor: number;
	breadcrumbs: string[];
	status: string;
	running: boolean;
	filter: string;
	content: string[];
	palette: boolean;
};

type TableHealth = {
	table_name: string;
	estimate: string;
};

type IndexRow = {
	indexname: string;
};

export const presets: Preset[] = [
	{
		id: "recent",
		label: "Recent events",
		desc: "Latest events by project, type, and path",
		params: ["projectId", "type", "path", "limit"],
		sql: `
select id::text, project_id, type, path, referrer, origin, host, device_type, visitor_id, session_id, country, city, is_localhost, ts::text, meta
from events
where ($1 = '' or project_id = $1)
  and ($2 = '' or type = $2)
  and ($3 = '' or path = $3)
order by ts desc
limit $4
`,
		values: function (values) {
			return [
				values.projectId || "",
				values.type || "",
				values.path || "",
				limitValue(values.limit),
			];
		},
	},
	{
		id: "journey",
		label: "Visitor journey",
		desc: "Timeline for a visitor_id",
		params: ["visitorId", "limit"],
		sql: `
select id::text, project_id, type, path, referrer, origin, host, device_type, visitor_id, session_id, country, city, is_localhost, ts::text, meta
from events
where visitor_id = $1
order by ts asc
limit $2
`,
		values: function (values) {
			return [values.visitorId || "", limitValue(values.limit)];
		},
	},
	{
		id: "session",
		label: "Session timeline",
		desc: "Timeline for a session_id",
		params: ["sessionId", "limit"],
		sql: `
select id::text, project_id, type, path, referrer, origin, host, device_type, visitor_id, session_id, country, city, is_localhost, ts::text, meta
from events
where session_id = $1
order by ts asc
limit $2
`,
		values: function (values) {
			return [values.sessionId || "", limitValue(values.limit)];
		},
	},
	{
		id: "errors",
		label: "Error events",
		desc: "Recent error and exception events",
		params: ["projectId", "limit"],
		sql: `
select id::text, project_id, type, path, referrer, origin, host, device_type, visitor_id, session_id, country, city, is_localhost, ts::text, meta
from events
where ($1 = '' or project_id = $1)
  and (type ilike '%error%' or type ilike '%exception%' or meta::text ilike '%error%')
order by ts desc
limit $2
`,
		values: function (values) {
			return [values.projectId || "", limitValue(values.limit)];
		},
	},
	{
		id: "bots",
		label: "Bot traffic",
		desc: "Events marked as bot traffic",
		params: ["limit"],
		sql: `
select id::text, project_id, type, path, referrer, origin, host, device_type, visitor_id, session_id, country, city, is_localhost, ts::text, meta
from events
where meta->>'botDetected' = 'true'
order by ts desc
limit $1
`,
		values: function (values) {
			return [limitValue(values.limit)];
		},
	},
	{
		id: "internal",
		label: "Internal traffic",
		desc: "Localhost or internal visitor traffic",
		params: ["limit"],
		sql: `
select id::text, project_id, type, path, referrer, origin, host, device_type, visitor_id, session_id, country, city, is_localhost, ts::text, meta
from events
where is_localhost = true or meta->>'isInternal' = 'true'
order by ts desc
limit $1
`,
		values: function (values) {
			return [limitValue(values.limit)];
		},
	},
];

function limitValue(value: string | undefined): number {
	const parsed = Number(value || "20");
	if (!Number.isFinite(parsed)) return 20;
	return Math.min(Math.max(Math.floor(parsed), 1), maxRows);
}

export function parseArgs(argv: string[]): Args {
	const args: Args = {
		target: "production",
		url: null,
		cmd: null,
		json: false,
		help: false,
	};

	for (let index = 0; index < argv.length; index++) {
		const arg = argv[index];
		if (arg === "--target") {
			args.target = parseTarget(argv[++index]);
		} else if (arg === "--url") {
			args.url = argv[++index] || null;
			args.target = "custom";
		} else if (arg === "--cmd") {
			args.cmd = argv[++index] || null;
		} else if (arg === "--json") {
			args.json = true;
		} else if (arg === "--help" || arg === "-h") {
			args.help = true;
		}
	}

	return args;
}

function parseTarget(value: string | undefined): Target {
	if (value === "local" || value === "custom" || value === "production") return value;
	return "production";
}

export function parseEnv(source: string): Record<string, string> {
	const values: Record<string, string> = {};
	for (const raw of source.split(/\r?\n/)) {
		const line = raw.trim();
		if (!line || line.startsWith("#")) continue;
		const index = line.indexOf("=");
		if (index === -1) continue;
		const key = line.slice(0, index).trim();
		const value = line
			.slice(index + 1)
			.trim()
			.replace(/^["']|["']$/g, "");
		values[key] = value;
	}
	return values;
}

export function loadConfig(args: Args, cwd = process.cwd()): Config {
	const candidates = [`${cwd}/${envPath}`, `${cwd}/${localEnvPath}`];
	let fileValues: Record<string, string> = {};
	let loadedPath: string | null = null;

	for (const path of candidates) {
		if (!existsSync(path)) continue;
		fileValues = parseEnv(readFileSync(path, "utf8"));
		loadedPath = path;
		break;
	}

	for (const [key, value] of Object.entries(fileValues)) {
		if (!process.env[key]) process.env[key] = value;
	}

	const target = args.target;
	const ingestUrl =
		args.url ||
		process.env.NEXT_PUBLIC_ANALYTICS_URL ||
		fileValues.NEXT_PUBLIC_ANALYTICS_URL ||
		process.env.INGEST_URL ||
		fileValues.INGEST_URL ||
		(target === "local" ? "http://localhost:3000" : defaultUrl);
	const databaseUrl = process.env.DATABASE_URL || fileValues.DATABASE_URL || null;
	const adminSecret = process.env.ADMIN_SECRET || fileValues.ADMIN_SECRET || null;
	const missing = [];
	if (!databaseUrl) missing.push("DATABASE_URL");
	if (!adminSecret) missing.push("ADMIN_SECRET");

	return {
		target,
		ingestUrl,
		databaseUrl,
		adminSecret,
		envPath: loadedPath,
		envLoaded: Boolean(loadedPath),
		missing,
	};
}

export function fuzzyFilter<T extends Choice>(items: T[], query: string): T[] {
	const normalized = query.trim().toLowerCase();
	if (!normalized) return items;

	return items
		.map(function (item) {
			const haystack = `${item.label} ${item.desc} ${item.value}`.toLowerCase();
			const score = fuzzyScore(haystack, normalized);
			return { item, score };
		})
		.filter(function (entry) {
			return entry.score > -1;
		})
		.sort(function (a, b) {
			return b.score - a.score;
		})
		.map(function (entry) {
			return entry.item;
		});
}

function fuzzyScore(source: string, query: string): number {
	let last = -1;
	let score = 0;
	for (const char of query) {
		const index = source.indexOf(char, last + 1);
		if (index === -1) return -1;
		score += index === last + 1 ? 3 : 1;
		last = index;
	}
	return score - source.length / 200;
}

function paint(color: string, text: string): string {
	return `${color}${text}${reset}`;
}

function stripAnsi(text: string): string {
	return text.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g"), "");
}

function formatJson(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

function run(
	command: string[],
	cwd = process.cwd(),
	stdin: string | null = null,
): Promise<RunResult> {
	return new Promise(function (resolve) {
		const child = spawn(command[0], command.slice(1), {
			cwd,
			env: process.env,
			stdio: [stdin ? "pipe" : "ignore", "pipe", "pipe"],
		});

		let text = "";
		child.stdout.on("data", function (data) {
			text += data.toString();
		});
		child.stderr.on("data", function (data) {
			text += data.toString();
		});
		child.on("close", function (code) {
			resolve({ code: code ?? 0, output: text });
		});
		if (stdin && child.stdin) {
			child.stdin.write(stdin);
			child.stdin.end();
		}
	});
}

function getSql(config: Config) {
	if (!config.databaseUrl) throw new Error("DATABASE_URL missing");
	return neon(config.databaseUrl);
}

async function getHealth(config: Config): Promise<unknown> {
	const response = await fetch(`${config.ingestUrl}/health`);
	const body = await response.json().catch(function () {
		return { ok: false, error: "Invalid JSON response" };
	});
	return { status: response.status, ok: response.ok, body };
}

async function getMetrics(config: Config): Promise<unknown> {
	const response = await fetch(`${config.ingestUrl}/metrics`);
	const body = await response.json().catch(function () {
		return { ok: false, error: "Invalid JSON response" };
	});
	return { status: response.status, ok: response.ok, body };
}

async function getAdmin(config: Config, path: string, method: string): Promise<unknown> {
	if (!config.adminSecret) throw new Error("ADMIN_SECRET missing");
	const response = await fetch(`${config.ingestUrl}${path}`, {
		method,
		headers: { "x-admin-secret": config.adminSecret },
	});
	const body = await response.json().catch(function () {
		return { ok: false, error: "Invalid JSON response" };
	});
	return { status: response.status, ok: response.ok, body };
}

async function getDeploys(): Promise<Deploy[]> {
	const result = await run(["vercel", "ls", "ingestion", "--format=json"]);
	if (result.code !== 0)
		throw new Error(result.output.trim() || "Could not read Vercel deployments");
	const data = JSON.parse(result.output) as { deployments?: Deploy[] };
	return Array.isArray(data.deployments) ? data.deployments : [];
}

async function getRecent(config: Config, limit = 20): Promise<EventRow[]> {
	const sql = getSql(config);
	return sql<EventRow[]>(presets[0].sql, ["", "", "", limitValue(String(limit))]);
}

async function runPreset(
	config: Config,
	preset: Preset,
	values: Record<string, string>,
): Promise<EventRow[]> {
	const sql = getSql(config);
	return sql<EventRow[]>(preset.sql, preset.values(values));
}

async function getVisitors(config: Config, query = "", limit = 20): Promise<VisitorRow[]> {
	const sql = getSql(config);
	return sql<VisitorRow[]>(
		`
select id::text, fingerprint, first_seen::text, last_seen::text, visit_count, is_internal, device_type, browser, os, country, city
from visitors
where ($1 = '' or fingerprint ilike '%' || $1 || '%')
order by last_seen desc
limit $2
`,
		[query, limitValue(String(limit))],
	);
}

async function getInsights(config: Config): Promise<Record<string, unknown>> {
	const sql = getSql(config);
	const volume = await sql(`
select date_trunc('hour', ts)::text as bucket, count(*)::int as count
from events
where ts > now() - interval '24 hours'
group by 1
order by 1 desc
limit 24
`);
	const paths = await sql(`
select coalesce(path, '(none)') as path, count(*)::int as count
from events
group by 1
order by 2 desc
limit 10
`);
	const types = await sql(`
select type, count(*)::int as count
from events
group by 1
order by 2 desc
limit 10
`);
	const countries = await sql(`
select coalesce(country, '(unknown)') as country, count(*)::int as count
from events
group by 1
order by 2 desc
limit 10
`);
	const vitals = await sql(`
select
  percentile_cont(0.95) within group (order by nullif(meta->>'lcp', '')::numeric) as lcp,
  percentile_cont(0.95) within group (order by nullif(meta->>'inp', '')::numeric) as inp,
  percentile_cont(0.95) within group (order by nullif(meta->>'cls', '')::numeric) as cls,
  percentile_cont(0.95) within group (order by nullif(meta->>'ttfb', '')::numeric) as ttfb
from events
where meta ?| array['lcp', 'inp', 'cls', 'ttfb']
`);
	const traffic = await sql(`
select
  count(*) filter (where meta->>'botDetected' = 'true')::int as bots,
  count(*) filter (where is_localhost = true or meta->>'isInternal' = 'true')::int as internal,
  count(*)::int as total
from events
`);
	return { volume, paths, types, countries, vitals: vitals[0], traffic: traffic[0] };
}

async function getDatabase(config: Config): Promise<Record<string, unknown>> {
	const sql = getSql(config);
	const tables = await sql<TableHealth[]>(`
select relname as table_name, n_live_tup::text as estimate
from pg_stat_user_tables
where relname in ('events', 'visitors', 'resume', 'old_resume', 'visitor_events', 'old_visitor_events')
order by relname
`);
	const bounds = await sql(`
select min(ts)::text as oldest, max(ts)::text as newest, count(*)::int as events from events
`);
	const visitors = await sql(`
select min(first_seen)::text as oldest, max(last_seen)::text as newest, count(*)::int as visitors from visitors
`);
	const indexes = await sql<IndexRow[]>(`
select indexname
from pg_indexes
where schemaname = 'public' and tablename in ('events', 'visitors')
order by indexname
`);
	const legacy = await sql(`
select to_regclass('public.resume') as resume,
       to_regclass('public.old_resume') as old_resume,
       to_regclass('public.visitor_events') as visitor_events,
       to_regclass('public.old_visitor_events') as old_visitor_events
`);
	return { tables, bounds: bounds[0], visitors: visitors[0], indexes, legacy: legacy[0] };
}

async function smoke(config: Config, overrides: Record<string, string> = {}): Promise<unknown> {
	const now = Date.now();
	const payload = {
		projectId: overrides.projectId || "verify",
		type: overrides.type || "ops_verify",
		path: overrides.path || "/ops",
		visitorId: overrides.visitorId || `ops-${now}`,
		sessionId: overrides.sessionId || `ops-${now}`,
		meta: {
			source: "ops-tool",
			checkedAt: new Date().toISOString(),
		},
	};
	const response = await fetch(`${config.ingestUrl}/ingest`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Origin: overrides.origin || "https://remcostoeten.nl",
		},
		body: JSON.stringify(payload),
	});
	const body = await response.json().catch(function () {
		return { ok: false, error: "Invalid JSON response" };
	});
	let verification: EventRow[] = [];
	if (config.databaseUrl) {
		const sql = getSql(config);
		verification = await sql<EventRow[]>(
			`
select id::text, project_id, type, path, referrer, origin, host, device_type, visitor_id, session_id, country, city, is_localhost, ts::text, meta
from events
where visitor_id = $1 and session_id = $2
order by ts desc
limit 1
`,
			[payload.visitorId, payload.sessionId],
		);
	}
	return { status: response.status, ok: response.ok, body, payload, verification };
}

async function pullEnv(): Promise<RunResult> {
	return run(
		["vercel", "env", "pull", ".env.local", "--environment=production", "--yes"],
		"apps/ingestion",
	);
}

function renderRows(rows: EventRow[]): string[] {
	if (rows.length === 0) return ["No matching events."];
	const lines: string[] = [];
	for (const row of rows) {
		lines.push(`${row.ts}  ${row.project_id}  ${row.type}  ${row.path || ""}`);
		lines.push(
			`visitor ${row.visitor_id || "-"}  session ${row.session_id || "-"}  ${row.country || "-"}`,
		);
		if (row.meta) lines.push(formatJson(row.meta));
		lines.push("");
	}
	return lines;
}

function renderVisitors(rows: VisitorRow[]): string[] {
	if (rows.length === 0) return ["No visitors found."];
	const lines: string[] = [];
	for (const row of rows) {
		lines.push(`${row.last_seen}  ${row.fingerprint}  visits ${row.visit_count}`);
		lines.push(
			`${row.device_type || "-"}  ${row.browser || "-"}  ${row.os || "-"}  ${row.country || "-"}`,
		);
		lines.push("");
	}
	return lines;
}

function renderObject(value: unknown): string[] {
	return formatJson(value).split("\n");
}

function screens(): Record<string, Screen> {
	return {
		home: {
			title: "Analytics Ops",
			parent: null,
			items: [
				{ label: "Overview", desc: "Health, metrics, env, deploys, counts", value: "overview" },
				{ label: "Deploys", desc: "Vercel deployments and commits", value: "deploys" },
				{ label: "Ingest", desc: "Health and smoke event builder", value: "ingest" },
				{
					label: "Pull Env",
					desc: "Pull Vercel production env into apps/ingestion/.env.local",
					value: "pull-env",
				},
				{ label: "Events", desc: "Recent events and advanced presets", value: "events" },
				{ label: "Visitors", desc: "Visitor search and timelines", value: "visitors" },
				{ label: "Insights", desc: "Traffic, top paths, countries, web vitals", value: "insights" },
				{ label: "Database", desc: "Tables, indexes, records, legacy checks", value: "database" },
				{ label: "Admin", desc: "Stats and cleanup with ADMIN_SECRET", value: "admin" },
				{ label: "Examples", desc: "Saved debugging cookbook", value: "examples" },
			],
		},
		events: {
			title: "Events",
			parent: "home",
			items: presets.map(function (preset) {
				return { label: preset.label, desc: preset.desc, value: `preset:${preset.id}` };
			}),
		},
		ingest: {
			title: "Ingest",
			parent: "home",
			items: [
				{ label: "Health", desc: "GET /health", value: "health" },
				{ label: "Metrics", desc: "GET /metrics", value: "metrics" },
				{ label: "Smoke", desc: "POST /ingest then verify in Neon", value: "smoke" },
			],
		},
		admin: {
			title: "Admin",
			parent: "home",
			items: [
				{ label: "Stats", desc: "Retention stats", value: "admin-stats" },
				{ label: "Cleanup", desc: "Run retention cleanup", value: "admin-cleanup" },
			],
		},
	};
}

function draw(state: AppState): void {
	const size = output.getWindowSize ? output.getWindowSize() : [100, 32];
	const width = size[0];
	const height = size[1];
	const allScreens = screens();
	const screen = allScreens[state.screen] || allScreens.home;
	const visible = fuzzyFilter(screen.items, state.filter);
	const lines: string[] = [];
	lines.push(paint(colors.cyan, `${colors.bold}${screen.title}${reset}`));
	lines.push(paint(colors.dim, state.breadcrumbs.join(" / ")));
	lines.push("");
	if (state.filter) lines.push(`Filter: ${state.filter}`);
	for (let index = 0; index < visible.length; index++) {
		const item = visible[index];
		const selected = index === state.cursor;
		const prefix = selected ? paint(colors.green, "›") : " ";
		const label = selected ? paint(colors.invert, item.label) : item.label;
		lines.push(`${prefix} ${label} ${paint(colors.dim, item.desc)}`);
	}
	if (state.content.length > 0) {
		lines.push("");
		lines.push(paint(colors.cyan, "Output"));
		lines.push(...state.content);
	}
	const footer = `${state.status}  target ${state.config.target}  url ${state.config.ingestUrl}  / palette  esc back  q quit`;
	output.write("\x1b[?25l\x1b[2J\x1b[H");
	for (const line of lines.slice(0, height - 2)) {
		const text = stripAnsi(line);
		output.write(line.slice(0, Math.max(width + line.length - text.length, 0)) + "\n");
	}
	output.write("\x1b[H");
	output.write(`\x1b[${height};1H${paint(colors.dim, footer.slice(0, width - 1))}`);
}

function keyName(data: Buffer): string {
	const value = data.toString("utf8");
	if (value === "\u0003") return "ctrl-c";
	if (value === "\u001b") return "escape";
	if (value === "\r") return "enter";
	if (value === "\u007f") return "backspace";
	if (value === "\u001b[A") return "up";
	if (value === "\u001b[B") return "down";
	if (value === "\u001b[D") return "left";
	if (value === "\u001b[C") return "right";
	if (value === "/") return "palette";
	return value;
}

async function question(text: string): Promise<string> {
	input.setRawMode(false);
	output.write(`\x1b[?25h\n${paint(colors.yellow, text)}`);
	const chunks: Buffer[] = [];
	for await (const chunk of input) {
		const buffer = Buffer.from(chunk);
		const value = buffer.toString("utf8");
		if (value.includes("\n") || value.includes("\r")) break;
		chunks.push(buffer);
	}
	input.setRawMode(true);
	return Buffer.concat(chunks).toString("utf8").trim();
}

async function confirm(text: string): Promise<boolean> {
	const answer = await question(`${text} Type yes: `);
	return isConfirmed(answer);
}

export function isConfirmed(answer: string): boolean {
	return answer.trim() === "yes";
}

async function chooseFzf(items: Choice[]): Promise<Choice | null> {
	const result = await run(
		["fzf", "--height=40%", "--reverse"],
		process.cwd(),
		items
			.map(function (item) {
				return `${item.label}\t${item.desc}\t${item.value}`;
			})
			.join("\n"),
	);
	if (result.code !== 0) return null;
	const value = result.output.trim().split("\t").at(-1);
	return (
		items.find(function (item) {
			return item.value === value;
		}) || null
	);
}

async function handleChoice(state: AppState, choice: Choice): Promise<void> {
	const allScreens = screens();
	if (allScreens[choice.value]) {
		state.screen = choice.value;
		state.cursor = 0;
		state.filter = "";
		state.content = [];
		state.breadcrumbs.push(choice.label);
		return;
	}

	state.status = `Running ${choice.label}`;
	draw(state);
	try {
		if (choice.value === "overview") state.content = await overviewLines(state.config);
		else if (choice.value === "deploys") state.content = renderObject(await getDeploys());
		else if (choice.value === "health") state.content = renderObject(await getHealth(state.config));
		else if (choice.value === "metrics")
			state.content = renderObject(await getMetrics(state.config));
		else if (choice.value === "smoke") state.content = renderObject(await smoke(state.config));
		else if (choice.value === "pull-env") state.content = renderObject(await pullEnv());
		else if (choice.value === "visitors")
			state.content = renderVisitors(
				await getVisitors(state.config, await question("Visitor search: ")),
			);
		else if (choice.value === "insights")
			state.content = renderObject(await getInsights(state.config));
		else if (choice.value === "database")
			state.content = renderObject(await getDatabase(state.config));
		else if (choice.value === "admin-stats")
			state.content = renderObject(await getAdmin(state.config, "/admin/stats", "GET"));
		else if (choice.value === "admin-cleanup") {
			if (await confirm("Run cleanup against configured target?")) {
				state.content = renderObject(await getAdmin(state.config, "/admin/cleanup", "POST"));
			} else {
				state.content = ["Cleanup cancelled."];
			}
		} else if (choice.value === "examples") state.content = examples();
		else if (choice.value.startsWith("preset:")) {
			const preset = presets.find(function (entry) {
				return entry.id === choice.value.slice("preset:".length);
			});
			if (preset) state.content = renderRows(await promptPreset(state.config, preset));
		}
		state.status = "Ready";
	} catch (error) {
		state.status = "Error";
		state.content = [error instanceof Error ? error.message : "Unknown error"];
	}
}

async function promptPreset(config: Config, preset: Preset): Promise<EventRow[]> {
	const values: Record<string, string> = {};
	for (const param of preset.params) {
		values[param] = await question(`${param}${param === "limit" ? " [20]" : ""}: `);
	}
	return runPreset(config, preset, values);
}

async function overviewLines(config: Config): Promise<string[]> {
	const result: Record<string, unknown> = {
		env: {
			loaded: config.envLoaded,
			path: config.envPath,
			missing: config.missing,
			database: config.databaseUrl ? "available" : "missing",
			admin: config.adminSecret ? "available" : "missing",
		},
	};
	try {
		result.health = await getHealth(config);
	} catch (error) {
		result.health = error instanceof Error ? error.message : "failed";
	}
	try {
		result.metrics = await getMetrics(config);
	} catch (error) {
		result.metrics = error instanceof Error ? error.message : "failed";
	}
	try {
		result.deploys = (await getDeploys()).slice(0, 3);
	} catch (error) {
		result.deploys = error instanceof Error ? error.message : "failed";
	}
	if (config.databaseUrl) {
		try {
			result.database = await getDatabase(config);
		} catch (error) {
			result.database = error instanceof Error ? error.message : "failed";
		}
	}
	return renderObject(result);
}

function examples(): string[] {
	return [
		"Recent production noise: Events -> Recent events, filter by projectId and path.",
		"Verify a deployment: Ingest -> Smoke, then inspect the verification row.",
		"Trace a user report: Events -> Visitor journey with visitor_id.",
		"Trace one browser tab: Events -> Session timeline with session_id.",
		"Check bot pressure: Events -> Bot traffic, then Insights traffic totals.",
		"Retention cleanup: Admin -> Stats, then Admin -> Cleanup after confirmation.",
		"CLI health: bun run ops -- --cmd health --json",
		"CLI recent: bun run ops -- --cmd recent --json",
	];
}

async function tui(config: Config): Promise<void> {
	if (!input.isTTY) throw new Error("TUI requires a TTY. Use --cmd for scriptable output.");
	const state: AppState = {
		config,
		screen: "home",
		cursor: 0,
		breadcrumbs: ["Analytics Ops"],
		status: "Ready",
		running: true,
		filter: "",
		content: [],
		palette: false,
	};

	input.setRawMode(true);
	input.resume();
	try {
		while (state.running) {
			draw(state);
			const key = await new Promise<string>(function (resolve) {
				input.once("data", function (data) {
					resolve(keyName(data));
				});
			});
			const screen = screens()[state.screen] || screens().home;
			const visible = fuzzyFilter(screen.items, state.filter);
			if (key === "ctrl-c" || key === "q") break;
			if (key === "up") state.cursor = Math.max(0, state.cursor - 1);
			else if (key === "down")
				state.cursor = Math.min(Math.max(visible.length - 1, 0), state.cursor + 1);
			else if (key === "escape" || key === "left") {
				if (state.filter) state.filter = "";
				else if (screen.parent) {
					state.screen = screen.parent;
					state.cursor = 0;
					state.content = [];
					state.breadcrumbs.pop();
				}
			} else if (key === "backspace") {
				state.filter = state.filter.slice(0, -1);
				state.cursor = 0;
			} else if (key === "enter") {
				const choice = visible[state.cursor];
				if (choice) await handleChoice(state, choice);
			} else if (key === "palette") {
				const all = Object.values(screens()).flatMap(function (screen) {
					return screen.items;
				});
				input.setRawMode(false);
				const choice = existsSync("/usr/bin/fzf") ? await chooseFzf(all) : null;
				input.setRawMode(true);
				if (choice) await handleChoice(state, choice);
			} else if (key.length === 1 && key >= " " && key <= "~") {
				state.filter += key;
				state.cursor = 0;
			}
		}
	} finally {
		input.setRawMode(false);
		output.write("\x1b[?25h\x1b[2J\x1b[H");
	}
}

async function runCmd(config: Config, cmd: string): Promise<unknown> {
	if (cmd === "health") return getHealth(config);
	if (cmd === "metrics") return getMetrics(config);
	if (cmd === "overview") return { lines: await overviewLines(config) };
	if (cmd === "recent") return getRecent(config);
	if (cmd === "query") return runPreset(config, presets[0], {});
	if (cmd === "smoke") return smoke(config);
	if (cmd === "cleanup") return getAdmin(config, "/admin/cleanup", "POST");
	throw new Error(`Unknown command: ${cmd}`);
}

function help(): string {
	return [
		"Usage: bun run ops -- [--target production|local|custom] [--url <ingest-url>] [--cmd health|metrics|overview|recent|query|smoke|cleanup] [--json]",
		"",
		"Interactive mode starts when --cmd is omitted.",
		"Build binary: bun run ops:build",
	].join("\n");
}

async function main(): Promise<void> {
	const args = parseArgs(Bun.argv.slice(2));
	if (args.help) {
		console.log(help());
		return;
	}
	const config = loadConfig(args);
	if (args.cmd) {
		const result = await runCmd(config, args.cmd);
		if (args.json) console.log(formatJson(result));
		else console.log(Array.isArray(result) ? renderObject(result).join("\n") : formatJson(result));
		return;
	}
	await tui(config);
}

if (import.meta.main) {
	try {
		await main();
	} catch (error) {
		console.error(paint(colors.red, error instanceof Error ? error.message : "Unknown error"));
		process.exit(1);
	}
}
