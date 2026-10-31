import type { Metadata } from "next";

import { HomeView } from "@/modules/home/components/home-view";

export const metadata: Metadata = { title: "Home" };

export default function Page() {
  return <HomeView />;
}
