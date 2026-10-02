import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

type Workspace = {
  name: string;
  directory: string;
};

type SourceFile = {
  path: string;
  content: string;
};

export type Violation = {
  file: string;
  specifier: string;
  reason: string;
};

export const allowedImports: { [workspace: string]: string[] } = {
  "packages/shared": [],
  "packages/contract": ["packages/shared"],
  "packages/engine": ["packages/contract", "packages/shared"],
  "packages/sdk": ["packages/shared", "packages/contract"],
  "apps/api": ["packages/engine", "packages/contract", "packages/shared"],
  "apps/dashboard": ["apps/api", "packages/contract"],
};

const sourcePattern = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
// Matches the module specifier of static imports, re-exports and dynamic imports.
const specifierPattern = /(?:\bfrom\s+|\bimport\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;

/**
 * @name importSpecifiers
 * @description Lists every module specifier a source file imports or re-exports, including
 * dynamic `import()` calls.
 *
 * @example
 * importSpecifiers('import { ok } from "@spoar/shared/result";');
 * // ["@spoar/shared/result"]
 */
export function importSpecifiers(content: string) {
  return Array.from(content.matchAll(specifierPattern), ([, specifier]) => specifier ?? "");
}

function owningWorkspace(path: string, workspaces: Workspace[]) {
  return workspaces.find((workspace) => path.startsWith(`${workspace.directory}/`));
}

function packageName(specifier: string) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] ?? specifier);
}

function checkSpecifier(
  file: SourceFile,
  specifier: string,
  owner: Workspace,
  workspaces: Workspace[],
): string | null {
  if (specifier.startsWith(".")) {
    const target = join(dirname(file.path), specifier);
    if (target === "v1" || target.startsWith("v1/")) return "v2 code never imports from v1/";
    if (!target.startsWith(`${owner.directory}/`)) {
      return `relative import leaves ${owner.directory}`;
    }
    return null;
  }
  const target = workspaces.find((workspace) => workspace.name === packageName(specifier));
  if (!target || target.directory === owner.directory) return null;
  if (target.directory.startsWith("v1/")) return "v2 code never imports from v1/";
  const allowed = allowedImports[owner.directory] ?? [];
  if (allowed.includes(target.directory)) return null;
  return `${owner.directory} may not import ${target.directory}`;
}

/**
 * @name findViolations
 * @description Checks every source file of a v2 workspace against the import boundaries in
 * `allowedImports`: which workspaces it may import, no relative imports out of its own folder,
 * and never anything from `v1/`.
 *
 * @example
 * const violations = findViolations(workspaces, files);
 * if (violations.length > 0) process.exit(1);
 */
export function findViolations(workspaces: Workspace[], files: SourceFile[]) {
  const violations: Violation[] = [];
  for (const file of files) {
    const owner = owningWorkspace(file.path, workspaces);
    if (!owner || owner.directory.startsWith("v1/")) continue;
    for (const specifier of importSpecifiers(file.content)) {
      const reason = checkSpecifier(file, specifier, owner, workspaces);
      if (reason) violations.push({ file: file.path, specifier, reason });
    }
  }
  return violations;
}

function listDirectories(path: string) {
  try {
    return readdirSync(path).filter((entry) => statSync(join(path, entry)).isDirectory());
  } catch {
    return [];
  }
}

function readPackageName(directory: string) {
  try {
    const manifest: { name?: string } = JSON.parse(
      readFileSync(join(directory, "package.json"), "utf8"),
    );
    return manifest.name ?? null;
  } catch {
    return null;
  }
}

function readWorkspaces(root: string) {
  const parents = ["apps", "packages", "tools/oxlint", "v1/apps", "v1/packages"];
  const workspaces: Workspace[] = [];
  for (const parent of parents) {
    for (const entry of listDirectories(join(root, parent))) {
      const directory = `${parent}/${entry}`;
      workspaces.push({ name: readPackageName(join(root, directory)) ?? directory, directory });
    }
  }
  return workspaces;
}

function readSources(root: string, directory: string): SourceFile[] {
  const files: SourceFile[] = [];
  for (const entry of readdirSync(join(root, directory))) {
    if (entry === "node_modules" || entry === "dist" || entry === ".next") continue;
    const path = `${directory}/${entry}`;
    if (statSync(join(root, path)).isDirectory()) {
      files.push(...readSources(root, path));
    } else if (sourcePattern.test(entry)) {
      files.push({ path, content: readFileSync(join(root, path), "utf8") });
    }
  }
  return files;
}

function main() {
  const root = resolve(import.meta.dir, "..");
  const workspaces = readWorkspaces(root);
  const files = workspaces
    .filter((workspace) => !workspace.directory.startsWith("v1/"))
    .flatMap((workspace) => readSources(root, workspace.directory));
  const violations = findViolations(workspaces, files);
  for (const violation of violations) {
    console.error(`${violation.file}: "${violation.specifier}" ${violation.reason}`);
  }
  console.log(`Checked ${files.length} files: ${violations.length} boundary violations`);
  if (violations.length > 0) process.exitCode = 1;
}

if (import.meta.main) main();
