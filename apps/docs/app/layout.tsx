import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./global.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "Spoar", template: "%s | Spoar docs" },
  description:
    "Privacy-first web analytics you host yourself. A typed SDK, one API for ingest, reads and sign-in, and a SQL console.",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <RootProvider theme={{ defaultTheme: "dark" }}>
          <Providers>{children}</Providers>
        </RootProvider>
      </body>
    </html>
  );
}
