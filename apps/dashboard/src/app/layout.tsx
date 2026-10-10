import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

import { QueryProvider } from "@/shared/query/provider";
import { Notifier } from "@/shared/ui/notifier";

export const metadata: Metadata = {
  title: { default: "Spoar", template: "%s | Spoar" },
  description: "Projects and keys for the Spoar analytics API.",
  robots: { index: false, follow: false },
};

type Props = { children: ReactNode };

export default function Layout({ children }: Props) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen">
        <QueryProvider>{children}</QueryProvider>
        <Notifier />
      </body>
    </html>
  );
}
