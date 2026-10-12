import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

type ChangeSection = {
  title: string;
  changes: string[];
};

type PackageVersion = {
  version: string;
  sections: ChangeSection[];
};

type PackageChangelog = {
  name: string;
  versions: PackageVersion[];
};

type CommitUpdate = {
  type: string;
  scope: string;
  title: string;
};

type UpdateGroup = {
  date: string;
  updates: CommitUpdate[];
};

type GeneratedChangelog = {
  releases: PackageChangelog[];
  updates: UpdateGroup[];
};

const root = join(import.meta.dir, "..", "..", "..");
const output = join(import.meta.dir, "..", "generated", "changelog.ts");
const packages = [
  { name: "@spoar/sdk", path: join(root, "packages", "sdk", "CHANGELOG.md") },
  { name: "@spoar/client", path: join(root, "packages", "client", "CHANGELOG.md") },
  { name: "@spoar/devtools", path: join(root, "packages", "devtools", "CHANGELOG.md") },
];

function parsePackageChangelog(name: string, text: string): PackageChangelog {
  const versions: PackageVersion[] = [];
  let version: PackageVersion | undefined;
  let section: ChangeSection | undefined;

  let skipping = false;

  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("## ")) {
      version = { version: line.slice(3).trim(), sections: [] };
      versions.push(version);
      section = undefined;
      continue;
    }
    if (line.startsWith("### ") && version) {
      section = { title: line.slice(4).trim(), changes: [] };
      version.sections.push(section);
      continue;
    }
    if (line.startsWith("- ") && section) {
      const change = line.slice(2).trim();
      skipping = change.startsWith("Updated dependencies");
      // Changesets prefixes each entry with the short commit hash, e.g. "1dd8040: ".
      if (!skipping) section.changes.push(change.replace(/^[0-9a-f]{7,}: /, ""));
      continue;
    }
    if (line.startsWith("  ") && section && section.changes.length > 0 && !skipping) {
      const index = section.changes.length - 1;
      const text = line.trim();
      const current = section.changes[index] ?? "";
      section.changes[index] = text
        ? `${current}${current.endsWith("\n\n") ? "" : " "}${text}`
        : `${current}\n\n`;
    }
  }

  for (const item of versions) {
    item.sections = item.sections.filter((entry) => entry.changes.length > 0);
  }

  return { name, versions };
}

function commitUpdate(
  date: string,
  subject: string,
): { date: string; update: CommitUpdate } | null {
  const match = subject.match(/^(feat|fix|perf|docs|refactor)(?:\(([^)]+)\))?!?:\s*(.+)$/);
  if (!match) return null;

  const type = match[1];
  const title = match[3];
  if (!type || !title || match[2] === "release") return null;

  return {
    date,
    update: {
      type,
      scope: match[2] ?? "repo",
      title: title.charAt(0).toUpperCase() + title.slice(1),
    },
  };
}

function readUpdates(): UpdateGroup[] {
  const result = Bun.spawnSync(
    [
      "git",
      "log",
      "--no-merges",
      "--max-count=100",
      "--date=short",
      "--format=%ad%x1f%s%x1e",
      "--",
      "apps/api",
      "apps/dashboard",
      "apps/docs",
      "packages/client",
      "packages/contract",
      "packages/devtools",
      "packages/sdk",
    ],
    { cwd: root },
  );
  if (result.exitCode !== 0) return [];

  const groups = new Map<string, CommitUpdate[]>();
  const entries = new TextDecoder().decode(result.stdout).split("\x1e");
  for (const entry of entries) {
    const [date, subject] = entry.trim().split("\x1f");
    if (!date || !subject) continue;
    const parsed = commitUpdate(date, subject);
    if (!parsed) continue;
    const updates = groups.get(parsed.date) ?? [];
    updates.push(parsed.update);
    groups.set(parsed.date, updates);
  }

  return [...groups].map(([date, updates]) => ({ date, updates }));
}

async function main() {
  const releases = await Promise.all(
    packages.map(async (item) =>
      parsePackageChangelog(item.name, await readFile(item.path, "utf8")),
    ),
  );
  const data: GeneratedChangelog = { releases, updates: readUpdates() };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `export const changelog = ${JSON.stringify(data, null, 2)} as const;\n`);
}

await main();
