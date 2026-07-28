import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { DEMO_DATABASE_URL, readEnvState, restoreOwnEnv, switchToDemo } from "./env.ts";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..");
const envFile = join(repoRoot, "apps", "example-dashboard", ".env.local");
const migrationsDir = join(repoRoot, "packages", "ingestion", "src", "db", "migrations");
const PSQL = ["exec", "-i", "analytics-demo-db", "psql", "-U", "postgres", "-d", "analytics", "-q", "-v", "ON_ERROR_STOP=1"];

function run(cmd: string, args: string[], stdin?: NodeJS.ReadableStream): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, {
			cwd: here,
			stdio: [stdin ? "pipe" : "inherit", "inherit", "inherit"],
		});
		if (stdin && child.stdin) stdin.pipe(child.stdin);
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
		});
	});
}

function runCapture(cmd: string, args: string[]): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { cwd: here, stdio: ["ignore", "pipe", "inherit"] });
		let out = "";
		child.stdout.on("data", (chunk) => {
			out += chunk;
		});
		child.on("close", (code) => {
			if (code === 0) resolve(out.trim());
			else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
		});
	});
}

function runToFile(cmd: string, args: string[], outFile: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { cwd: repoRoot, stdio: ["ignore", "pipe", "inherit"] });
		const sink = createWriteStream(outFile);
		child.stdout.pipe(sink);
		child.on("close", (code) => {
			sink.end();
			if (code === 0) resolve();
			else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`));
		});
	});
}

async function askYesNo(question: string): Promise<boolean> {
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question(`${question} [y/N] `);
	rl.close();
	return /^y(es)?$/i.test(answer.trim());
}

async function applyEnvChoice(): Promise<void> {
	const state = readEnvState(envFile);

	if (process.argv.includes("--restore")) {
		restoreOwnEnv(envFile);
		console.log("Restored your own DATABASE_URL in apps/example-dashboard/.env.local.");
		return;
	}
	if (process.argv.includes("--use-demo")) {
		if (state !== "demo") switchToDemo(envFile);
		console.log("Dashboard now points at the demo database.");
		return;
	}

	if (state === "demo") {
		if (!process.stdin.isTTY) {
			console.log("Dashboard is on the demo database (pass --restore to switch back).");
			return;
		}
		if (await askYesNo("Dashboard is currently on the demo database. Switch back to your own DATABASE_URL?")) {
			restoreOwnEnv(envFile);
			console.log("Restored your own DATABASE_URL.");
		} else {
			console.log("Kept the demo database.");
		}
		return;
	}

	if (!process.stdin.isTTY) {
		console.log("Keeping your current env (pass --use-demo to point the dashboard at the demo DB).");
		return;
	}
	if (
		await askYesNo(
			"Point the dashboard at the demo database? (your current DATABASE_URL is kept as a comment and restored on switch-back)",
		)
	) {
		switchToDemo(envFile);
		console.log("Dashboard now points at the demo database. Run `bun run demo:db -- --restore` to switch back.");
	} else {
		console.log("Kept your current env. Run against the demo DB ad hoc with:");
		console.log(`  DATABASE_URL=${DEMO_DATABASE_URL} bun dev`);
	}
}

if (process.argv.includes("--restore")) {
	await applyEnvChoice();
	process.exit(0);
}

console.log("Starting demo database containers...");
await run("docker", ["compose", "up", "-d", "--wait"]);

const schemaExists = await runCapture("docker", [
	...PSQL,
	"-tA",
	"-c",
	"SELECT to_regclass('events') IS NOT NULL",
]);
if (schemaExists === "t") {
	console.log("Schema already applied (run `docker compose down -v` here for a clean slate).");
} else {
	console.log("Applying migrations...");
	const migrations = readdirSync(migrationsDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();
	for (const file of migrations) {
		await run("docker", PSQL, createReadStream(join(migrationsDir, file)));
	}
}

const existing = await runCapture("docker", [
	...PSQL,
	"-tA",
	"-c",
	"SELECT COUNT(*) FROM events",
]);
if (Number(existing) > 0 && !process.argv.includes("--force")) {
	console.log(`events table already has ${existing} rows; pass --force to reseed`);
} else {
	console.log("Seeding demo data...");
	const workDir = mkdtempSync(join(tmpdir(), "analytics-demo-seed-"));
	const seedFile = join(workDir, "seed.sql");
	try {
		await runToFile("bun", [join(here, "seed.ts")], seedFile);
		await run("docker", PSQL, createReadStream(seedFile));
	} finally {
		rmSync(workDir, { recursive: true, force: true });
	}
}

console.log("");
console.log("Demo database ready.");
await applyEnvChoice();
console.log("");
console.log("Stop it with: docker compose -f scripts/demo-db/docker-compose.yml down");

if (process.stdin.isTTY && (await askYesNo("Start the dashboard dev server now?"))) {
	const child = spawn("bun", ["run", "--cwd", join(repoRoot, "apps", "example-dashboard"), "dev"], {
		cwd: repoRoot,
		stdio: "inherit",
	});
	child.on("close", (code) => process.exit(code ?? 0));
}
