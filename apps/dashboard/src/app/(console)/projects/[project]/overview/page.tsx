import type { Metadata } from "next";

import { OverviewView } from "@/modules/analytics/components/overview-view";

export const metadata: Metadata = { title: "Traffic overview" };

export default function Page() {
  return <OverviewView />;
}
