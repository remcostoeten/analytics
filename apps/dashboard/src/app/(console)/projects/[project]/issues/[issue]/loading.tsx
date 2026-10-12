import { DetailSkeleton } from "@/modules/analytics/components/skeletons";

export default function Loading() {
  return <DetailSkeleton back="Back to issues" facts={6} columns="sm:grid-cols-3 lg:grid-cols-6" />;
}
