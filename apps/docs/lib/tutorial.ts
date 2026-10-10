import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const steps = [1, 2, 3, 4, 5, 6, 7] as const;

export type TutorialStep = (typeof steps)[number];

export type StepFiles = { [path: string]: string };

export type StepNote = {
  file: string;
  match: string;
  text: string;
};

export type StepChange = {
  name: string;
  before: string;
  after: string;
  notes: { line: number; text: string }[];
};

const exampleRoot = join(process.cwd(), "..", "..", "examples", "dashboard");

const sourcePattern = /\.tsx?$/;

function stepDirectory(step: TutorialStep) {
  return step === 7
    ? join(exampleRoot, "src")
    : join(exampleRoot, "steps", String(step).padStart(2, "0"), "src");
}

async function listSources(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile() && sourcePattern.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
}

/**
 * @name readStep
 * @description Reads the TypeScript sources of one tutorial step from `examples/dashboard`, keyed
 * by their path from the app root. Steps 1 to 6 are the snapshots in `steps/`, step 7 is the
 * example's own `src`.
 *
 * @example
 * const files = await readStep(3);
 * files["src/api.ts"];
 */
export async function readStep(step: TutorialStep): Promise<StepFiles> {
  const directory = stepDirectory(step);
  const paths = await listSources(directory);
  const contents = await Promise.all(paths.map((path) => readFile(path, "utf8")));
  return Object.fromEntries(
    paths.map((path, index) => [`src/${relative(directory, path)}`, contents[index] ?? ""]),
  );
}

function lineOf(source: string, match: string) {
  const index = source.split("\n").findIndex((line) => line.includes(match));
  return index === -1 ? null : index + 1;
}

/**
 * @name diffSteps
 * @description The files a step adds or changes against the step before, in path order, with each
 * note placed on the first added line that contains its `match`. A note whose file or text is not
 * in the step throws, so a page that drifts from the example fails the build.
 *
 * @example
 * const changes = diffSteps(await readStep(2), await readStep(3), [
 *   { file: "src/api.ts", match: "api.project(", text: "One scope per project." },
 * ]);
 */
export function diffSteps(before: StepFiles, after: StepFiles, notes: StepNote[] = []) {
  const changes: StepChange[] = Object.keys(after)
    .sort()
    .filter((name) => before[name] !== after[name])
    .map((name) => ({ name, before: before[name] ?? "", after: after[name] ?? "", notes: [] }));
  for (const note of notes) {
    const change = changes.find((candidate) => candidate.name === note.file);
    if (!change) throw new Error(`Tutorial note on ${note.file}, which this step does not change`);
    const line = lineOf(change.after, note.match);
    if (line === null) throw new Error(`Tutorial note "${note.match}" is not in ${note.file}`);
    change.notes.push({ line, text: note.text });
  }
  return changes;
}

/**
 * @name stepChanges
 * @description Reads a step and the one before it and returns what the step adds or changes. Step 1
 * compares against an empty app, so every file is new.
 *
 * @example
 * const changes = await stepChanges(5, notes);
 */
export async function stepChanges(step: TutorialStep, notes: StepNote[] = []) {
  const previous = steps[steps.indexOf(step) - 1];
  return diffSteps(previous ? await readStep(previous) : {}, await readStep(step), notes);
}
