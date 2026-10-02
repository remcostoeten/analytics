import type { Metadata } from "next";

import {
  Capabilities,
  Customers,
  Features,
  Footer,
  Hero,
  HowItWorks,
  Nav,
  Platform,
} from "@/features/stackly/components";

export const metadata: Metadata = {
  title: "Stackly",
  description: "Turn scattered tasks into shipped software.",
};

export default function Page() {
  return (
    <div className="px-0 py-0 xl:px-16 xl:py-16">
      <div className="frame mx-auto max-w-[1440px]">
        <Nav />
        <main>
          <Hero />
          <Customers />
          <HowItWorks />
          <Capabilities />
          <Features />
          <Platform />
        </main>
        <Footer />
      </div>
    </div>
  );
}
