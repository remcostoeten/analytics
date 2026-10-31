import type { Metadata } from "next";

import { VisitorsView } from "@/modules/analytics/components/visitors-view";

export const metadata: Metadata = { title: "Visitors" };

export default function Page() {
  return <VisitorsView />;
}
