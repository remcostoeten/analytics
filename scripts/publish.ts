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

type Ranges = { [name: string]: string };

const root = join(import.meta.dir, "..");
const packages = join(root, "packages");
const dependencyFields = ["dependencies", "peerDependencies", "optionalDependencies"];

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

function pinRange(range: string, version: string | undefined): string {
  if (!range.startsWith("workspace:") || !version) return range;
  const spec = range.slice("workspace:".length);
  if (spec === "*" || spec === "") return version;
  if (spec === "^" || spec === "~") return `${spec}${version}`;
  return spec;
}

/**
 * @name pinWorkspaceRanges
 * @description Replaces `workspace:` ranges in the published dependency fields with the current version of each workspace package (`workspace:^` becomes `^0.2.0`), so the tarball never depends on the versions `bun pm pack` reads from a stale `bun.lock`.
 * @example pinWorkspaceRanges({ name: "@spoar/sdk", version: "2.2.1", dependencies: { "@spoar/debugtools": "workspace:^" } }, new Map([["@spoar/debugtools", "0.2.0"]]))
 */
export function pinWorkspaceRanges(manifest: Manifest, versions: Map<string, string>): Manifest {
  const next: Manifest = { ...manifest };
  for (const field of dependencyFields) {
    const ranges = manifest[field] as Ranges | undefined;
    if (!ranges) continue;
    next[field] = Object.fromEntries(
      Object.entries(ranges).map(([name, range]) => [name, pinRange(range, versions.get(name))]),
    );
  }
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

function workspaceVersions(): Map<string, string> {
  const versions = new Map<string, string>();
  for (const folder of readdirSync(packages)) {
    const text = readText(join(packages, folder, "package.json"));
    if (!text) continue;
    const { name, version } = JSON.parse(text) as Manifest;
    versions.set(name, version);
  }
  return versions;
}

function pack(
  directory: string,
  manifest: Manifest,
  versions: Map<string, string>,
  destination: string,
): string {
  const path = join(directory, "package.json");
  const original = readFileSync(path, "utf8");
  const published = publishManifest(pinWorkspaceRanges(manifest, versions));
  writeFileSync(path, `${JSON.stringify(published, null, "\t")}\n`);
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
  const versions = workspaceVersions();
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
    const tarball = pack(directory, manifest, versions, destination);
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
