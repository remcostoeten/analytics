import { existsSync, readFileSync, writeFileSync } from "node:fs";

const BLOCK_START = "# >>> demo-db (managed by `bun run demo:db`) >>>";
const BLOCK_END = "# <<< demo-db <<<";
const SAVED_PREFIX = "# demo-db saved: ";
export const DEMO_DATABASE_URL =
	"postgres://postgres:postgres@db.localtest.me:5433/analytics";

export type EnvState = "demo" | "own" | "missing";

export function readEnvState(envFile: string): EnvState {
	if (!existsSync(envFile)) return "missing";
	return readFileSync(envFile, "utf8").includes(BLOCK_START) ? "demo" : "own";
}

export function switchToDemo(envFile: string): void {
	if (readEnvState(envFile) === "demo") return;
	const lines = existsSync(envFile) ? readFileSync(envFile, "utf8").split("\n") : [];
	const rewritten = lines.map((line) =>
		/^\s*DATABASE_URL\s*=/.test(line) ? `${SAVED_PREFIX}${line}` : line,
	);
	while (rewritten.length > 0 && rewritten[rewritten.length - 1].trim() === "") {
		rewritten.pop();
	}
	rewritten.push("", BLOCK_START, `DATABASE_URL=${DEMO_DATABASE_URL}`, BLOCK_END, "");
	writeFileSync(envFile, rewritten.join("\n"));
}

export function restoreOwnEnv(envFile: string): void {
	if (!existsSync(envFile)) return;
	const lines = readFileSync(envFile, "utf8").split("\n");
	const result: string[] = [];
	let inBlock = false;
	for (const line of lines) {
		if (line === BLOCK_START) {
			inBlock = true;
			if (result.length > 0 && result[result.length - 1].trim() === "") result.pop();
			continue;
		}
		if (line === BLOCK_END) {
			inBlock = false;
			continue;
		}
		if (inBlock) continue;
		result.push(line.startsWith(SAVED_PREFIX) ? line.slice(SAVED_PREFIX.length) : line);
	}
	writeFileSync(envFile, result.join("\n"));
}
