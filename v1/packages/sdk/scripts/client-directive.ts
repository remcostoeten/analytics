import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const files = ["index.js", "index.cjs"];
const directive = '"use client";';

for (const file of files) {
	const path = join(import.meta.dirname, "..", "dist", file);
	const source = readFileSync(path, "utf8");
	if (source.startsWith(directive)) continue;
	writeFileSync(path, `${directive}\n${source}`);
}
