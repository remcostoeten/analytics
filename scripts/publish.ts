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
 * @name isPrerelease
 * @description Tells whether a version has a prerelease part such as `-next.3`; only stable versions publish, always to `latest`.
 * @example isPrerelease("2.0.0-next.3")
 */
export function isPrerelease(version: string): boolean {
  return /^\d+\.\d+\.\d+-/.test(version);
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
  const destination = mkdtempSync(join(tmpdir(), "spoar-publish-"));
  const failed: string[] = [];
  for (const folder of readdirSync(packages)) {
    const directory = join(packages, folder);
    const text = readText(join(directory, "package.json"));
    if (!text) continue;
    const manifest = JSON.parse(text) as Manifest;
    if (manifest.private) continue;
    const id = `${manifest.name}@${manifest.version}`;
    if (isPrerelease(manifest.version)) {
      console.log(`${id} is a prerelease; only stable versions publish`);
      continue;
    }
    if (isPublished(manifest.name, manifest.version)) {
      console.log(`${id} is already on npm`);
      continue;
    }
    const tarball = pack(directory, manifest, destination);
    const file = tarball.startsWith("/") ? tarball : join(destination, tarball);
    const command = ["npm", "publish", file, "--access", "public", "--tag", "latest"];
    if (dryRun) command.push("--dry-run");
    else command.push("--provenance");
    if (!run(command, root).ok) {
      console.error(
        `::error::npm publish failed for ${id}. A 404 on PUT means npm rejected the CI identity: check that ${manifest.name} lists remcostoeten/analytics and release.yml as its trusted publisher.`,
      );
      failed.push(id);
      continue;
    }
    if (!dryRun) console.log(`New tag: ${id}`);
  }
  if (failed.length > 0) {
    console.error(`Not published: ${failed.join(", ")}`);
    process.exitCode = 1;
  }
}

if (import.meta.main) main();
