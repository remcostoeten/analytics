import type { Metadata } from "next";

import { IssueView } from "@/modules/analytics/components/issue-view";

export const metadata: Metadata = { title: "Issue" };

export default function Page() {
  return <IssueView />;
}
