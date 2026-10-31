import type { Metadata } from "next";

import { LogsView } from "@/modules/analytics/components/logs-view";

export const metadata: Metadata = { title: "Logs" };

export default function Page() {
  return <LogsView />;
}
