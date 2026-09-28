import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";

export type Budget = {
  file: string;
  limitBytes: number;
};

export type Measured = Budget & {
  gzipBytes: number;
  over: boolean;
};

const dist = join(import.meta.dir, "..", "packages", "sdk", "dist");

export const budgets: Budget[] = [{ file: "index.mjs", limitBytes: 4.5 * 1024 }];

/**
 * @name measure
 * @description Gzips each built SDK entry and compares it with its budget in bytes.
 *
 * @example
 * measure(budgets, (file) => readFileSync(join(dist, file)));
 */
export function measure(list: Budget[], read: (file: string) => Uint8Array): Measured[] {
  return list.map((budget) => {
    const gzipBytes = gzipSync(read(budget.file), { level: 9 }).length;
    return { ...budget, gzipBytes, over: gzipBytes > budget.limitBytes };
  });
}

function kilobytes(bytes: number) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function main() {
  const missing = budgets.filter((budget) => !existsSync(join(dist, budget.file)));
  if (missing.length > 0) {
    console.error(
      `Build the SDK first: ${missing.map((budget) => budget.file).join(", ")} missing in packages/sdk/dist`,
    );
    process.exitCode = 1;
    return;
  }
  const results = measure(budgets, (file) => readFileSync(join(dist, file)));
  for (const result of results) {
    const verdict = result.over ? "over" : "within";
    console.log(
      `${result.file}: ${kilobytes(result.gzipBytes)} gzip, ${verdict} the ${kilobytes(result.limitBytes)} budget`,
    );
  }
  if (results.some((result) => result.over)) process.exitCode = 1;
}

if (import.meta.main) main();
