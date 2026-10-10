import { parseDiffFromFile } from "@pierre/diffs";
import type { DiffLineAnnotation } from "@pierre/diffs/ssr";
import { preloadFileDiff } from "@pierre/diffs/ssr";
import { cacheLife } from "next/cache";

import { diffThemes, registerDiffThemes } from "@/lib/diff-themes";
import { stepChanges } from "@/lib/tutorial";
import type { StepNote, TutorialStep } from "@/lib/tutorial";

import { StepDiffView } from "./step-diff-view";
import type { PreloadedChange } from "./step-diff-view";

registerDiffThemes();

type Props = {
  step: TutorialStep;
  notes?: StepNote[];
};

async function preloadStep(step: TutorialStep, notes: StepNote[]): Promise<PreloadedChange[]> {
  "use cache";
  cacheLife("max");
  const changes = await stepChanges(step, notes);
  return Promise.all(
    changes.map(async (change) => {
      const added = change.before === "";
      const fileDiff = parseDiffFromFile(
        added ? null : { name: change.name, contents: change.before },
        { name: change.name, contents: change.after },
      );
      const annotations: DiffLineAnnotation<{ text: string }>[] = change.notes.map((note) => ({
        side: "additions",
        lineNumber: note.line,
        metadata: { text: note.text },
      }));
      const preloaded = await preloadFileDiff<{ text: string }>({
        fileDiff,
        options: { theme: diffThemes, diffStyle: "unified", overflow: "wrap" },
        annotations,
      });
      return {
        name: change.name,
        added,
        fileDiff,
        annotations,
        prerenderedHTML: preloaded.prerenderedHTML,
      };
    }),
  );
}

export async function StepDiff({ step, notes = [] }: Props) {
  const changes = await preloadStep(step, notes);
  return <StepDiffView changes={changes} />;
}
