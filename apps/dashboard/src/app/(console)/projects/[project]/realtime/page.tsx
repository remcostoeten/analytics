import type { Metadata } from "next";

import { RealtimeView } from "@/modules/analytics/components/realtime-view";

export const metadata: Metadata = { title: "Realtime" };

export default function Page() {
  return <RealtimeView />;
}
