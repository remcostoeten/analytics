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
    <>
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
    </>
  );
}
