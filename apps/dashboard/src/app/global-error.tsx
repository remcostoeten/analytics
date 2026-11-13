"use client";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

import { StatusPage } from "@/modules/shell/components/status-page";
import { basePath, siteUrl } from "@/shared/config/site";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function GlobalError({ error, retry }: Props) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen">
        <title>Something went wrong | Spoar</title>
        <StatusPage
          eyebrow="Error"
          title="Something went wrong"
          description={
            <>
              The dashboard failed to load. Try again, or reload it from the start.
              {error.digest ? (
                <span className="mt-2 block font-mono text-xs">Reference {error.digest}</span>
              ) : null}
            </>
          }
        >
          <button type="button" onClick={() => retry()} className="solid-button">
            Try again
          </button>
          <a href={`${basePath}/`} className="ghost-button">
            Back to the dashboard
          </a>
          <a href={`${siteUrl()}/docs`} className="ghost-button">
            Read the docs
          </a>
        </StatusPage>
      </body>
    </html>
  );
}
