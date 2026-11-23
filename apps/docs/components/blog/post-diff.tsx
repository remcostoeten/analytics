import { cacheLife } from "next/cache";

import { preloadChange } from "@/components/tutorial/preload-change";
import { StepDiffView } from "@/components/tutorial/step-diff-view";
import { postDiffChange, type PostDiffId } from "@/lib/blog-diffs";

type Props = {
  id: PostDiffId;
};

async function preloadPostDiff(id: PostDiffId) {
  "use cache";
  cacheLife("max");
  return preloadChange(postDiffChange(id));
}

export async function PostDiff({ id }: Props) {
  const change = await preloadPostDiff(id);
  return <StepDiffView changes={[change]} showSummary={false} />;
}
