import type { Metadata } from "next";

import { AnalyticsView } from "@/modules/analytics/components/analytics-view";

export const metadata: Metadata = { title: "Web analytics" };

export default function Page() {
  return <AnalyticsView />;
}
