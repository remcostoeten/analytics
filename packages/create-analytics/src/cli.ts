import { parseArgs } from "node:util";
import { resolve } from "node:path";
import { access } from "node:fs/promises";
import { scaffoldProject } from "./scaffold";
import { parseTier, promptProjectName, promptTier } from "./prompt";
import { type Tier } from "./types";

type CliArgs = {
	projectName?: string;
	tier?: string;
	yes?: boolean;
};

function printUsage(): void {
	console.log(`
@remcostoeten/create-analytics — scaffold Remco Analytics

Usage:
  npx @remcostoeten/create-analytics@latest [project-name] [options]

Options:
  --tier <separate|colocated|sdk-only>  Integration tier (default: separate)
  --yes                                 Skip prompts when tier is set
  -h, --help                            Show help

Tiers:
  separate   SDK in apps/web, ingestion in apps/analytics-api (recommended)
  colocated  SDK + ingestion API route in one Next.js app
  sdk-only   SDK only, existing ingestion URL
`);
}

async function directoryEmpty(dir: string): Promise<boolean> {
	try {
		await access(dir);
		return false;
	} catch {
		return true;
	}
}

async function resolveOptions(args: CliArgs, positionalName?: string): Promise<{
	projectName: string;
	projectId: string;
	tier: Tier;
	targetDir: string;
}> {
	const defaultName = positionalName?.trim() || "my-analytics-app";
	let tier = parseTier(args.tier);
	let projectName = defaultName;

	if (!tier && !args.yes) {
		tier = await promptTier();
		projectName = await promptProjectName(defaultName);
	} else {
		tier = tier ?? "separate";
		if (!args.yes && !args.tier) {
			projectName = await promptProjectName(defaultName);
		}
	}

	const targetDir = resolve(process.cwd(), projectName);

	if (!(await directoryEmpty(targetDir))) {
		console.error(`Error: "${projectName}" already exists. Choose a different name or empty the folder.`);
		process.exit(1);
	}

	return {
		projectName,
		projectId: projectName,
		tier,
		targetDir,
	};
}

async function main(): Promise<void> {
	const { values, positionals } = parseArgs({
		args: process.argv.slice(2),
		options: {
			tier: { type: "string" },
			yes: { type: "boolean", short: "y" },
			help: { type: "boolean", short: "h" },
		},
		allowPositionals: true,
	});

	if (values.help) {
		printUsage();
		return;
	}

	const options = await resolveOptions(
		{
			tier: values.tier,
			yes: values.yes,
		},
		positionals[0],
	);

	console.log(`\nScaffolding ${options.projectName} (${options.tier})...\n`);

	const written = await scaffoldProject(options);

	for (const file of written) {
		console.log(`  created ${file}`);
	}

	console.log(`
Done. Next steps:

  cd ${options.projectName}
  cat README.md
`);

	if (options.tier === "separate") {
		console.log(`  Tier 1: deploy apps/analytics-api separately, then set NEXT_PUBLIC_ANALYTICS_URL in apps/web`);
	}

	if (options.tier === "colocated") {
		console.log(`  Tier 2: adds ingestion deps to this deploy — see README for bundle tradeoff`);
	}
}

main().catch(function (error) {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
