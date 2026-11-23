import { cacheLife } from "next/cache";

import { stepChanges } from "@/lib/tutorial";
import type { StepNote, TutorialStep } from "@/lib/tutorial";

import { preloadChange } from "./preload-change";
import { StepDiffView } from "./step-diff-view";
import type { PreloadedChange } from "./step-diff-view";

type Props = {
  step: TutorialStep;
  notes?: StepNote[];
};

async function preloadStep(step: TutorialStep, notes: StepNote[]): Promise<PreloadedChange[]> {
  "use cache";
  cacheLife("max");
  const changes = await stepChanges(step, notes);
  return Promise.all(changes.map(preloadChange));
}

export async function StepDiff({ step, notes = [] }: Props) {
  const changes = await preloadStep(step, notes);
  return <StepDiffView changes={changes} />;
}
