import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { Newsreader } from "next/font/google";
import Script from "next/script";

import "./globals.css";

import { sidebarBootstrap } from "@/modules/shell/sidebar-bootstrap";
import { themeBootstrap } from "@/modules/shell/theme-bootstrap";
import { QueryProvider } from "@/shared/query/provider";
import { Notifier } from "@/shared/ui/notifier";

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.analytics.remcostoeten.nl"),
  title: { default: "Spoar", template: "%s | Spoar" },
  description: "Projects and keys for the Spoar analytics API.",
  robots: { index: false, follow: false },
  openGraph: {
    type: "website",
    siteName: "Spoar",
    title: "Spoar dashboard",
    description: "Privacy-first web analytics you host yourself.",
  },
  twitter: { card: "summary_large_image", title: "Spoar dashboard" },
};

const serif = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
});

type Props = { children: ReactNode };

export default function Layout({ children }: Props) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${serif.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen">
        <Script id="shell-state" strategy="beforeInteractive">
          {themeBootstrap + sidebarBootstrap}
        </Script>
        <QueryProvider>{children}</QueryProvider>
        <Notifier />
      </body>
    </html>
  );
}
