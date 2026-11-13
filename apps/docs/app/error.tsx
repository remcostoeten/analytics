"use client";

import Link from "next/link";

import { serif } from "@/components/landing/serif";
import { SiteNav } from "@/components/landing/site-nav";
import { StatusPage } from "@/components/landing/status-page";
import { dashboardUrl } from "@/lib/dashboard-url";
import { siteLinks } from "@/lib/site-links";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ error, retry }: Props) {
  return (
    <div className={`landing ${serif.variable} flex min-h-screen flex-col bg-surface text-fg`}>
      <SiteNav links={siteLinks()} loginHref={dashboardUrl("/sign-in")} />
      <div className="flex flex-1 flex-col pt-20">
        <StatusPage
          eyebrow="Error"
          title="Something went wrong"
          description={
            <>
              This page failed to load. Try again, or head back home.
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
          <Link href="/" className="pill-ghost px-4! py-2.5!">
            Back to home
          </Link>
          <Link href="/docs" className="pill-ghost px-4! py-2.5!">
            Read the docs
          </Link>
        </StatusPage>
      </div>
    </div>
  );
}
