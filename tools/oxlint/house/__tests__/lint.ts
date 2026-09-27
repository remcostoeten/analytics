import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

type Diagnostic = {
  code: string;
  message: string;
};

type Report = {
  diagnostics: Diagnostic[];
};

const pluginPath = resolve(import.meta.dir, "../src/index.ts");
const oxlintPath = resolve(import.meta.dir, "../../../../node_modules/.bin/oxlint");

function parseReport(output: string): Report {
  const report: Report = JSON.parse(output);
  return report;
}

export async function lintSource(fileName: string, source: string, rule: string) {
  const directory = await mkdtemp(join(tmpdir(), "oxlint-house-"));
  const config = {
    jsPlugins: [{ name: "house", specifier: pluginPath }],
    categories: { correctness: "off" },
    rules: { [`house/${rule}`]: "error" },
  };
  try {
    await writeFile(join(directory, ".oxlintrc.json"), JSON.stringify(config));
    await writeFile(join(directory, fileName), source);
    const child = Bun.spawn([oxlintPath, "--format", "json", fileName], {
      cwd: directory,
      stdout: "pipe",
      stderr: "pipe",
    });
    const output = await new Response(child.stdout).text();
    await child.exited;
    return parseReport(output).diagnostics.map((diagnostic) => diagnostic.code);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
