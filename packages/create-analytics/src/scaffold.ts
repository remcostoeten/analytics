import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { buildFiles } from "./templates";
import { type ScaffoldOptions } from "./types";

export async function scaffoldProject(options: ScaffoldOptions): Promise<string[]> {
	const files = buildFiles(options);
	const written: string[] = [];

	for (const file of files) {
		const fullPath = join(options.targetDir, file.path);
		await mkdir(dirname(fullPath), { recursive: true });
		await writeFile(fullPath, file.content, "utf8");
		written.push(file.path);
	}

	return written;
}
