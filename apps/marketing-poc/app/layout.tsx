import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./global.css";

export const metadata: Metadata = {
  title: { default: "Marketing POC", template: "%s | Marketing POC" },
  description: "Landing page experiments.",
};

type Props = {
  children: ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
