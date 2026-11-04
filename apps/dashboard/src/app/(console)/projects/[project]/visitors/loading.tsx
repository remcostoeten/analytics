import { ghostSizes } from "@/modules/shell/components/ghost-sizes";
import { PanelSkeleton } from "@/modules/shell/components/skeletons";

export default function Loading() {
  return <PanelSkeleton height={ghostSizes.visitorList} summary />;
}
