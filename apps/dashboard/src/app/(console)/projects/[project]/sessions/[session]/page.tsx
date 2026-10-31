import type { Metadata } from "next";

import { SessionView } from "@/modules/analytics/components/session-view";

export const metadata: Metadata = { title: "Session" };

export default function Page() {
  return <SessionView />;
}
