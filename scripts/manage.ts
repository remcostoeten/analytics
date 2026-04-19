#!/usr/bin/env bun
import { spawn } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import { colors, header, prompt, pad, colorizeJson } from "./modules/ui";
import { serve } from "bun";
import { execSync } from "child_process";

// --------------------------------------------------------
// State & Metadata
// --------------------------------------------------------
let gitHash = "unknown";
let npmVersion = "fetching...";
const repoUrl = "https://github.com/remcostoeten/analytics";
const npmUrl = "https://www.npmjs.com/package/@remcostoeten/analytics";

try {
	gitHash = execSync("git rev-parse --short HEAD", { stdio: "pipe" }).toString().trim();
} catch {}

fetch("https://registry.npmjs.org/@remcostoeten/analytics/latest")
	.then((r) => r.json())
	.then((data: any) => { npmVersion = data.version; })
	.catch(() => { npmVersion = "unavailable"; });

// --------------------------------------------------------
// Command Runners
// --------------------------------------------------------
async function execCommand(command: string, cwd?: string): Promise<number> {
	console.log(`\n  ${colors.cyan}▶ Running: ${colors.bold}${command}${colors.reset}\n`);
	return new Promise((resolve) => {
		const child = spawn(command, {
			shell: true,
			cwd: cwd || process.cwd(),
			stdio: "inherit",
		});
		child.on("close", (code) => resolve(code || 0));
	});
}

// --------------------------------------------------------
// Version Management
// --------------------------------------------------------
function getVersion(packagePath: string): string {
	try {
		return JSON.parse(readFileSync(packagePath, "utf-8")).version;
	} catch {
		return "0.0.0";
	}
}

function updateVersion(packagePath: string, newVersion: string) {
	const pkg = JSON.parse(readFileSync(packagePath, "utf-8"));
	pkg.version = newVersion;
	writeFileSync(packagePath, JSON.stringify(pkg, null, 2) + "\n");
}

// --------------------------------------------------------
// Feature: Deployment & Release
// --------------------------------------------------------
async function runDeployMenu() {
	console.clear();
	header("Deployment & Release Manager");
	
	console.log(`  1. Build all packages`);
	console.log(`  2. Build + Deploy Dashboard (Vercel)`);
	console.log(`  3. Build + Publish SDK (npm)`);
	console.log(`  4. Run Test Suite`);
	console.log(`  5. Run Typecheck`);
	console.log(`  6. Create Git Tag`);
	console.log(`  0. Back to Main Menu`);

	const choice = await prompt("\n  Select an option: ");

	switch (choice) {
		case "1":
			await execCommand("bun run build");
			break;
		case "2": {
			const prod = (await prompt("  Deploy to production? (y/n): ")).toLowerCase() === "y";
			await execCommand(prod ? "vercel --prod" : "vercel", "apps/example-dashboard");
			break;
		}
		case "3":
			await handleSdkPublish();
			break;
		case "4":
			await execCommand("bun test");
			break;
		case "5":
			await execCommand("bun run typecheck");
			break;
		case "6":
            // Tagging logic
			break;
		case "0":
			return;
	}
	await prompt("\n  Press Enter to continue...");
	await runDeployMenu();
}

async function handleSdkPublish() {
	header("SDK Publish Workflow");
	const pkgPath = "packages/sdk/package.json";
	const current = getVersion(pkgPath);
	console.log(`  Current version: ${colors.cyan}${current}${colors.reset}`);
	
	const next = (await prompt(`  New version (y for auto-patch) [${current}]: `)).toLowerCase();
	if (next === 'y' || next !== '') {
        const newVer = next === 'y' ? current.replace(/(\d+)$/, (m) => String(Number(m) + 1)) : next;
		updateVersion(pkgPath, newVer);
		console.log(`  Updated to ${colors.green}${newVer}${colors.reset}`);
	}
	
	await execCommand("bun run build", "packages/sdk");
	const confirm = (await prompt("  Publish to npm now? (y/n): ")).toLowerCase();
	if (confirm === 'y') {
		await execCommand("npm publish --access public", "packages/sdk");
	}
}

// --------------------------------------------------------
// Feature: Ingestion Dev Server
// --------------------------------------------------------
async function runDevServer() {
	// Dynamically import the app to avoid loading it if not needed
	// and to ensure process.env.DATABASE_URL can be set if needed
	const { default: app } = await import("../apps/ingestion/src/app");
	
	let server: any = null;
	const port = 3000;
	
	try {
		server = serve({
			fetch: app.fetch,
			port,
		});
		
		const baseUrl = `http://localhost:${server.port}`;
		header("Ingestion Dev Server Active");
		console.log(`  Listening at ${colors.green}${baseUrl}${colors.reset}`);
		console.log(`  Press 'q' to stop server and return to menu\n`);

		// Minimalistic log loop or interactive prompt
		await new Promise((resolve) => {
			process.stdin.setRawMode(true);
			process.stdin.resume();
			process.stdin.on("data", (data) => {
				if (data.toString().toLowerCase() === "q") {
					server.stop();
					process.stdin.setRawMode(false);
					resolve(true);
				}
			});
		});
	} catch (err: any) {
		console.error(`  ${colors.red}Failed to start server: ${err.message}${colors.reset}`);
		await prompt("\n  Press Enter to continue...");
	}
}

// --------------------------------------------------------
// Feature: Dashboard Dev Server
// --------------------------------------------------------
async function runDashboardDev() {
	header("Dashboard Dev Server");
	console.log(`  Starting Next.js dev server...`);
	await execCommand("bun run dev", "apps/example-dashboard");
}

// --------------------------------------------------------
// Main Entry Point
// --------------------------------------------------------
async function mainMenu() {
	console.clear();
	header("Remco Analytics Monorepo Manager");

	console.log(`  ${colors.cyan}1.${colors.reset} Start Ingestion ${colors.dim}(Interactive Server)${colors.reset}`);
	console.log(`  ${colors.cyan}2.${colors.reset} Start Dashboard ${colors.dim}(Next.js Dev)${colors.reset}`);
	console.log(`  ${colors.cyan}3.${colors.reset} Deployment & Release ${colors.dim}(Vercel/NPM/Tags)${colors.reset}`);
	console.log(`  ${colors.cyan}4.${colors.reset} Run Full Quality Gate ${colors.dim}(Lint/Typecheck/Test)${colors.reset}`);
	console.log(`  ${colors.cyan}5.${colors.reset} Project Information`);
	console.log(`  ${colors.cyan}0.${colors.reset} Exit`);

	const choice = await prompt("\n  Select an option: ");

	switch (choice) {
		case "1":
			await runDevServer();
			break;
		case "2":
			await runDashboardDev();
			break;
		case "3":
			await runDeployMenu();
			break;
		case "4":
			header("Running Quality Gates");
			await execCommand("bun run lint");
			await execCommand("bun run typecheck");
			await execCommand("bun test");
			break;
		case "5":
			console.log(`\n  ${colors.bold}Project Info:${colors.reset}`);
			console.log(`  ${pad("SDK Version:", 15)} ${npmVersion}`);
			console.log(`  ${pad("Git Hash:", 15)} ${gitHash}`);
			console.log(`  ${pad("Repo:", 15)} ${repoUrl}`);
			break;
		case "0":
			console.log(`\n  ${colors.green}Goodbye!${colors.reset}\n`);
			process.exit(0);
	}

	await prompt("\n  Press Enter to continue...");
	await mainMenu();
}

mainMenu().catch(err => {
	console.error(`\n  ${colors.red}Fatal Error: ${err.message}${colors.reset}`);
	process.exit(1);
});
