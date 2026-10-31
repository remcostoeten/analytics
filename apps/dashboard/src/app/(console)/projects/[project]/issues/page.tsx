import type { Metadata } from "next";

import { IssuesView } from "@/modules/analytics/components/issues-view";

export const metadata: Metadata = { title: "Issues" };

export default function Page() {
  return <IssuesView />;
}
