import type { Metadata } from "next";

import {
  Crosshair,
  Footer,
  Hero,
  Ledger,
  Manifesto,
  Plans,
  Steps,
  Ticker,
  TopBar,
} from "@/features/terminal/components";

export const metadata: Metadata = {
  title: "Stackly Terminal",
  description: "Plans change. Ship anyway.",
};

export default function Page() {
  return (
    <div className="terminal-page min-h-screen bg-[#070708] text-[#f2f1ed]">
      <Crosshair />
      <TopBar />
      <main>
        <Hero />
        <Ticker />
        <Steps />
        <Ledger />
        <Manifesto />
        <Plans />
      </main>
      <Footer />
    </div>
  );
}
