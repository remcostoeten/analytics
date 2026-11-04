import { ghostSizes } from "@/modules/shell/components/ghost-sizes";
import { DetailSkeleton } from "@/modules/shell/components/skeletons";

export default function Loading() {
  return <DetailSkeleton height={ghostSizes.sessionTrail} facts={4} />;
}
