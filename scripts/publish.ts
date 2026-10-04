import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export type Manifest = {
  name: string;
  version: string;
  private?: boolean;
  exports?: { [path: string]: unknown };
  publishConfig?: { exports?: { [path: string]: unknown }; [key: string]: unknown };
  [key: string]: unknown;
};

const root = join(import.meta.dir, "..");
const packages = join(root, "packages");

/**
 * @name publishManifest
 * @description Returns the manifest npm should see: `exports` taken from `publishConfig.exports`, which point at `dist`, and no `devDependencies`, so the workspace keeps resolving `src`.
 * @example publishManifest({ name: "@spoar/sdk", version: "2.0.0", exports: { ".": "./src/index.ts" }, publishConfig: { exports: { ".": "./dist/index.mjs" } } })
 */
export function publishManifest(manifest: Manifest): Manifest {
  const publishExports = manifest.publishConfig?.exports;
  if (!publishExports) return manifest;
  const publishConfig = { ...manifest.publishConfig };
  delete publishConfig.exports;
  const next: Manifest = { ...manifest, exports: publishExports, publishConfig };
  delete next.devDependencies;
  if (Object.keys(publishConfig).length === 0) delete next.publishConfig;
  return next;
}

/**
 * @name prereleaseTag
 * @description Reads the npm dist-tag from `.changeset/pre.json`, or `latest` outside pre mode.
 * @example prereleaseTag('{"mode":"pre","tag":"next"}')
 */
export function prereleaseTag(preJson: string | null): string {
  if (!preJson) return "latest";
  const pre = JSON.parse(preJson) as { mode?: string; tag?: string };
  return pre.mode === "pre" && pre.tag ? pre.tag : "latest";
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function run(command: string[], cwd: string): { ok: boolean; out: string } {
  const result = Bun.spawnSync(command, { cwd, stdout: "pipe", stderr: "inherit" });
  return { ok: result.exitCode === 0, out: result.stdout.toString().trim() };
}

function isPublished(name: string, version: string): boolean {
  return run(["npm", "view", `${name}@${version}`, "version"], root).out === version;
}

function pack(directory: string, manifest: Manifest, destination: string): string {
  const path = join(directory, "package.json");
  const original = readFileSync(path, "utf8");
  writeFileSync(path, `${JSON.stringify(publishManifest(manifest), null, "\t")}\n`);
  try {
    const packed = run(["bun", "pm", "pack", "--destination", destination, "--quiet"], directory);
    if (!packed.ok) throw new Error(`bun pm pack failed for ${manifest.name}`);
    return packed.out.split("\n").at(-1) ?? "";
  } finally {
    writeFileSync(path, original);
  }
}

function main(): void {
  const dryRun = process.argv.includes("--dry-run");
  const tag = prereleaseTag(readText(join(root, ".changeset", "pre.json")));
  const destination = mkdtempSync(join(tmpdir(), "spoar-publish-"));
  for (const folder of readdirSync(packages)) {
    const directory = join(packages, folder);
    const text = readText(join(directory, "package.json"));
    if (!text) continue;
    const manifest = JSON.parse(text) as Manifest;
    if (manifest.private) continue;
    if (isPublished(manifest.name, manifest.version)) {
      console.log(`${manifest.name}@${manifest.version} is already on npm`);
      continue;
    }
    const tarball = pack(directory, manifest, destination);
    const file = tarball.startsWith("/") ? tarball : join(destination, tarball);
    const command = ["npm", "publish", file, "--access", "public", "--tag", tag];
    if (dryRun) command.push("--dry-run");
    else command.push("--provenance");
    if (!run(command, root).ok) throw new Error(`npm publish failed for ${manifest.name}`);
    if (!dryRun) console.log(`New tag: ${manifest.name}@${manifest.version}`);
  }
}

if (import.meta.main) main();
