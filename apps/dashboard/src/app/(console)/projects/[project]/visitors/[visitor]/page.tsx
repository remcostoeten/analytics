import type { Metadata } from "next";

import { VisitorView } from "@/modules/analytics/components/visitor-view";

export const metadata: Metadata = { title: "Visitor" };

export default function Page() {
  return <VisitorView />;
}
