import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

type Diagnostic = {
  code: string;
  filename: string;
};

type Report = {
  diagnostics: Diagnostic[];
};

export type LintCase = {
  name: string;
  source: string;
  codes: string[];
};

const pluginPath = resolve(import.meta.dir, "../src/index.ts");
const oxlintPath = resolve(import.meta.dir, "../../../../node_modules/.bin/oxlint");

function parseReport(output: string): Report {
  const report: Report = JSON.parse(output);
  return report;
}

function caseFile(index: number, extension: string) {
  return `case-${index}.${extension}`;
}

export async function lintCases(cases: LintCase[], extension: string, rule: string) {
  const directory = await mkdtemp(join(tmpdir(), "oxlint-house-"));
  const config = {
    jsPlugins: [{ name: "house", specifier: pluginPath }],
    categories: { correctness: "off" },
    rules: { [`house/${rule}`]: "error" },
  };
  try {
    await writeFile(join(directory, ".oxlintrc.json"), JSON.stringify(config));
    await Promise.all(
      cases.map((entry, index) =>
        writeFile(join(directory, caseFile(index, extension)), entry.source),
      ),
    );
    const child = Bun.spawn([oxlintPath, "--format", "json", "."], {
      cwd: directory,
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(child.stdout).text();
    await child.exited;
    const { diagnostics } = parseReport(output);
    return cases.map((_, index) =>
      diagnostics
        .filter((diagnostic) => diagnostic.filename.endsWith(caseFile(index, extension)))
        .map((diagnostic) => diagnostic.code),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
