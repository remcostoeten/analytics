import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./global.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://docs.analytics.remcostoeten.nl"),
  alternates: { canonical: "./" },
  title: {
    default: "Spoar | Privacy-First Web Analytics on Postgres",
    template: "%s | Spoar docs",
  },
  description:
    "Privacy-first web analytics you host yourself. A typed SDK, one API for ingest, reads and sign-in, and a SQL console.",
  openGraph: {
    type: "website",
    siteName: "Spoar",
    title: "Spoar | Privacy-First Web Analytics on Postgres",
    description: "Privacy-first web analytics you host yourself.",
    url: "https://docs.analytics.remcostoeten.nl",
  },
  twitter: {
    card: "summary_large_image",
    title: "Spoar | Privacy-First Web Analytics on Postgres",
    description: "Privacy-first web analytics you host yourself.",
  },
  verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
    : undefined,
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <RootProvider theme={{ defaultTheme: "light" }}>
          <Providers>{children}</Providers>
        </RootProvider>
      </body>
    </html>
  );
}
