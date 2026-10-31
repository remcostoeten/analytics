import type { Metadata } from "next";

import { SpeedView } from "@/modules/analytics/components/speed-view";

export const metadata: Metadata = { title: "Speed" };

export default function Page() {
  return <SpeedView />;
}
