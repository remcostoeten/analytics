"use client";

import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./global.css";

import { serif } from "@/components/landing/serif";
import { StatusPage } from "@/components/landing/status-page";
import { Logo } from "@/components/logo";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function GlobalError({ error, retry }: Props) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <title>Something went wrong | Spoar</title>
        <div className={`landing ${serif.variable} flex min-h-screen flex-col bg-surface text-fg`}>
          <nav className="flex justify-center px-4 pt-3">
            <a
              href="/"
              className="flex items-center gap-2 rounded-full border border-line bg-surface/85 py-2 pr-4 pl-2.5 text-[0.85rem] font-medium tracking-tight"
            >
              <Logo className="size-6" />
              Spoar
            </a>
          </nav>
          <div className="flex flex-1 flex-col pt-8">
            <StatusPage
              eyebrow="Error"
              title="Something went wrong"
              description={
                <>
                  The site failed to load. Try again, or reload from the homepage.
                  {error.digest ? (
                    <span className="mt-2 block font-mono text-[0.75rem]">
                      Reference {error.digest}
                    </span>
                  ) : null}
                </>
              }
            >
              <button type="button" onClick={() => retry()} className="pill-dark px-5! py-2.5!">
                Try again
              </button>
              <a href="/" className="pill-ghost px-4! py-2.5!">
                Back to home
              </a>
              <a href="/docs" className="pill-ghost px-4! py-2.5!">
                Read the docs
              </a>
            </StatusPage>
          </div>
        </div>
      </body>
    </html>
  );
}
