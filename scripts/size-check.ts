import { existsSync, readdirSync, readFileSync } from "node:fs";
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

const sdk = join(import.meta.dir, "..", "packages", "sdk");
const devtools = join(import.meta.dir, "..", "packages", "devtools", "dist");
const pluginDirectory = join(sdk, "src", "plugins");
const pluginBudget = 0.6 * 1024;

export const entryBudgets: Budget[] = [
  { file: "index.mjs", limitBytes: 5 * 1024 },
  { file: "react.mjs", limitBytes: 1.5 * 1024 },
  { file: "next.mjs", limitBytes: 1 * 1024 },
];

export const devtoolsBudgets: Budget[] = [
  { file: "index.mjs", limitBytes: 1 * 1024 },
  { file: "react.mjs", limitBytes: 1 * 1024 },
  { file: "next.mjs", limitBytes: 1 * 1024 },
];

// The lazy panel chunk of @spoar/devtools, such as mount-panel-CbhGSFvW.mjs.
const panelChunk = /^mount-panel-[\w-]+\.mjs$/;

export const pluginExceptions: { [file: string]: number } = {
  "speed-insights.ts": 2.5 * 1024,
  "errors.ts": 0.7 * 1024,
};

/**
 * @name measure
 * @description Gzips each entry and compares it with its budget in bytes.
 *
 * @example
 * measure(entryBudgets, (file) => readFileSync(join(dist, file)));
 */
export function measure(list: Budget[], read: (file: string) => Uint8Array): Measured[] {
  return list.map((budget) => {
    const gzipBytes = gzipSync(read(budget.file), { level: 9 }).length;
    return { ...budget, gzipBytes, over: gzipBytes > budget.limitBytes };
  });
}

/**
 * @name pluginBudgets
 * @description One budget per plugin file: 0.6 KB, except the plugins listed in
 * `pluginExceptions`.
 *
 * @example
 * pluginBudgets(["clicks.ts", "speed-insights.ts"]); // 614 and 2560 bytes
 */
export function pluginBudgets(files: string[]): Budget[] {
  return files
    .filter((file) => file.endsWith(".ts") && file !== "index.ts")
    .sort()
    .map((file) => ({ file, limitBytes: pluginExceptions[file] ?? pluginBudget }));
}

async function bundlePlugin(file: string) {
  const result = await Bun.build({
    entrypoints: [join(pluginDirectory, file)],
    minify: true,
    target: "browser",
    format: "esm",
    external: ["web-vitals"],
  });
  const [output] = result.outputs;
  if (!result.success || !output) throw new Error(`could not bundle ${file}`);
  return new Uint8Array(await output.arrayBuffer());
}

// Local chunk imports in minified output, such as from"./pageviews-GZg8eq_4.mjs".
const chunkImport = /from\s*"\.\/([^"]+\.mjs)"/g;

/**
 * @name withChunks
 * @description A built entry together with every local chunk it imports, directly or through
 * another chunk, so shared code split out by the bundler still counts toward the entry.
 *
 * @example
 * withChunks("index.mjs", (file) => readFileSync(join(dist, file), "utf8"));
 */
export function withChunks(entry: string, read: (file: string) => string): string {
  const seen = new Set<string>();
  const pending = [entry];
  let code = "";
  while (pending.length > 0) {
    const file = pending.pop() ?? entry;
    if (seen.has(file)) continue;
    seen.add(file);
    const text = read(file);
    code += text;
    for (const match of text.matchAll(chunkImport)) if (match[1]) pending.push(match[1]);
  }
  return code;
}

function kilobytes(bytes: number) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function readText(directory: string) {
  return (file: string) => readFileSync(join(directory, file), "utf8");
}

function measureEntries(list: Budget[], directory: string) {
  return measure(list, (entry) => new TextEncoder().encode(withChunks(entry, readText(directory))));
}

function print(results: Measured[], prefix: string) {
  for (const result of results) {
    const verdict = result.over ? "OVER" : "within";
    console.log(
      `${`${prefix}${result.file}`.padEnd(36)} ${kilobytes(result.gzipBytes)} gzip, ${verdict} ${kilobytes(result.limitBytes)}`,
    );
  }
}

async function main() {
  const missing = entryBudgets.find((budget) => !existsSync(join(sdk, "dist", budget.file)));
  if (missing) {
    console.error(`Build the SDK first: packages/sdk/dist/${missing.file} is missing`);
    process.exitCode = 1;
    return;
  }
  const loaderMissing = devtoolsBudgets.find((budget) => !existsSync(join(devtools, budget.file)));
  if (loaderMissing) {
    console.error(`Build devtools first: packages/devtools/dist/${loaderMissing.file} is missing`);
    process.exitCode = 1;
    return;
  }
  const plugins = pluginBudgets(readdirSync(pluginDirectory));
  const bundles = new Map<string, Uint8Array>();
  for (const plugin of plugins) bundles.set(plugin.file, await bundlePlugin(plugin.file));
  const results = [
    ...measureEntries(entryBudgets, join(sdk, "dist")),
    ...measure(plugins, (file) => bundles.get(file) ?? new Uint8Array()),
  ];
  const loaders = measureEntries(devtoolsBudgets, devtools);
  print(results, "");
  print(loaders, "devtools/");
  for (const file of readdirSync(devtools)
    .filter((name) => panelChunk.test(name))
    .sort()) {
    const bytes = gzipSync(readFileSync(join(devtools, file)), { level: 9 }).length;
    console.log(`${`devtools/${file}`.padEnd(36)} ${kilobytes(bytes)} gzip, lazy panel, no budget`);
  }
  if ([...results, ...loaders].some((result) => result.over)) process.exitCode = 1;
}

if (import.meta.main) await main();
