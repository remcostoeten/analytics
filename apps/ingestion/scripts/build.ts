import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "fs";
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
	"../../packages/ingestion/dist/vercel.js",
	"--outfile",
	join(funcDir, "index.js"),
	"--target",
	"node",
	"--format",
	"cjs",
	"--bundle",
]);

await bundleAsnDatabase();

/**
 * Ships the GeoLite2 ASN database inside the function bundle so ASN lookup
 * (GEOIP_ASN_MMDB_PATH=/var/task/GeoLite2-ASN.mmdb) works on Vercel. Uses the
 * gitignored local copy when present, otherwise downloads the P3TERX mirror.
 */
async function bundleAsnDatabase(): Promise<void> {
	const fileName = "GeoLite2-ASN.mmdb";
	const localCopy = join("data", fileName);
	const target = join(funcDir, fileName);
	if (existsSync(localCopy)) {
		copyFileSync(localCopy, target);
		return;
	}
	console.log("Downloading GeoLite2 ASN database...");
	const response = await fetch(
		"https://github.com/P3TERX/GeoLite.mmdb/releases/latest/download/GeoLite2-ASN.mmdb",
	);
	if (!response.ok) {
		throw new Error(`ASN database download failed: ${response.status}`);
	}
	writeFileSync(target, Buffer.from(await response.arrayBuffer()));
}

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
