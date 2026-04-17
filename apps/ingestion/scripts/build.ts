import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { spawn } from "child_process";

const outputDir = join(".vercel", "output");
const funcDir = join(outputDir, "functions", "index.func");

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(funcDir, { recursive: true });

console.log("Building bundle...");

function run(cmd: string, args: string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, { stdio: "inherit", shell: false });
		child.on("close", (code) => {
			if (code === 0) resolve();
			else reject(new Error(`Command failed with code ${code}`));
		});
	});
}

await run("bun", [
	"build",
	"src/handler.ts",
	"--outfile",
	join(funcDir, "index.js"),
	"--target",
	"node",
	"--format",
	"cjs",
	"--bundle",
]);

writeFileSync(
	join(funcDir, "package.json"),
	JSON.stringify({
		name: "@remcostoeten/ingestion",
		type: "commonjs",
		dependencies: {},
	}),
);

writeFileSync(
	`${funcDir}/.vc-config.json`,
	JSON.stringify({
		runtime: "nodejs20.x",
		handler: "index.js",
		launcherType: "Nodejs",
		shouldAddHelpers: false,
	}),
);

writeFileSync(
	join(outputDir, "config.json"),
	JSON.stringify({
		version: 3,
		routes: [{ src: "/(.*)", dest: "/index" }],
	}),
);

console.log("Build complete!");
