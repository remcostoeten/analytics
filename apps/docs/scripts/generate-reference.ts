import { rm } from "node:fs/promises";

import { generateFiles } from "fumadocs-openapi";
import type { OutputEntry, OutputFile, OutputGroup } from "fumadocs-openapi";

import { openapi } from "../lib/openapi";

type BeforeWrite = {
  readonly generatedEntries: Record<string, OutputEntry[]>;
};

const output = "./content/docs/reference";
const base = "/docs/reference";
const { bundled } = await openapi.getSchema("../api/openapi.json");
const tagNames = (bundled.tags ?? []).map((tag) => tag.name);

function kebab(value: string) {
  return value
    .replaceAll("{", "")
    .replaceAll("}", "")
    .split(/[^a-zA-Z0-9]+/)
    .filter((part) => part.length > 0)
    .join("-")
    .toLowerCase();
}

function slugOf(path: string) {
  return path.endsWith(".mdx") ? path.slice(0, -4) : path;
}

function order(group: OutputGroup) {
  const index = group.tag ? tagNames.indexOf(group.tag.name) : -1;
  return index === -1 ? tagNames.length : index;
}

function titleOf(group: OutputGroup) {
  return group.tag?.name ?? group.info.title;
}

function operations(group: OutputGroup) {
  return group.entries.filter((entry) => entry.type === "operation");
}

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function groupMeta(group: OutputGroup): OutputFile {
  const pages = operations(group).map((entry) => slugOf(entry.path).slice(group.path.length + 1));
  return {
    path: `${group.path}/meta.json`,
    content: json({ title: titleOf(group), description: group.tag?.description, pages }),
  };
}

function section(group: OutputGroup) {
  const cards = operations(group).map(
    (entry) =>
      `<Card href="${base}/${slugOf(entry.path)}" title=${JSON.stringify(entry.info.title)} />`,
  );
  return [
    `## ${titleOf(group)}`,
    "",
    group.tag?.description ?? "",
    "",
    "<Cards>",
    ...cards,
    "</Cards>",
    "",
  ];
}

function navigation(this: BeforeWrite, files: OutputFile[]) {
  const groups = Object.values(this.generatedEntries)
    .flat()
    .filter((entry) => entry.type === "group")
    .toSorted((left, right) => order(left) - order(right));
  const index = [
    "---",
    "title: API reference",
    "description: Every route of the v2 API, generated from apps/api/openapi.json and grouped by tag.",
    "---",
    "",
    ...groups.flatMap(section),
  ].join("\n");
  files.push(
    ...groups.map(groupMeta),
    { path: "index.mdx", content: index },
    {
      path: "meta.json",
      content: json({
        title: "API reference",
        root: true,
        pagesIndex: "index",
        pages: groups.map((group) => group.path),
      }),
    },
  );
}

await rm(output, { recursive: true, force: true });

await generateFiles({
  input: openapi,
  output,
  per: "operation",
  groupBy: "tag",
  name: (entry) =>
    entry.type === "operation"
      ? kebab(`${entry.item.method} ${entry.item.path}`)
      : kebab(entry.item.name),
  slugify: kebab,
  includeDescription: true,
  addGeneratedComment: false,
  beforeWrite: navigation,
});
