import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { type Tier } from "./types";

const tierLabels: Record<Tier, string> = {
	separate: "Separate analytics-api project (recommended)",
	colocated: "API route in this app (larger server bundle)",
	"sdk-only": "SDK only — I already have an ingestion URL",
};

export async function promptTier(): Promise<Tier> {
	const rl = createInterface({ input, output });

	console.log("\nIntegration tier:\n");
	const tiers: Tier[] = ["separate", "colocated", "sdk-only"];
	for (let i = 0; i < tiers.length; i++) {
		const marker = i === 0 ? "→" : " ";
		console.log(`  ${marker} ${i + 1}. ${tierLabels[tiers[i]]}`);
	}

	const answer = await rl.question("\nChoose [1]: ");
	rl.close();

	const index = answer.trim() === "" ? 0 : Number.parseInt(answer, 10) - 1;
	if (index >= 0 && index < tiers.length) return tiers[index];

	return "separate";
}

export async function promptProjectName(defaultName: string): Promise<string> {
	const rl = createInterface({ input, output });
	const answer = await rl.question(`Project name [${defaultName}]: `);
	rl.close();

	const name = answer.trim() || defaultName;
	return name.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();
}

export function parseTier(value: string | undefined): Tier | null {
	if (value === "separate" || value === "1") return "separate";
	if (value === "colocated" || value === "2") return "colocated";
	if (value === "sdk-only" || value === "sdk" || value === "3") return "sdk-only";
	return null;
}
