"use client";

import { StatusPage } from "@/modules/shell/components/status-page";
import { siteUrl } from "@/shared/config/site";
import { Link } from "@/shared/ui/link";

type Props = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function ErrorPage({ error, retry }: Props) {
  return (
    <StatusPage
      eyebrow="Error"
      title="Something went wrong"
      description={
        <>
          This page failed to load. Try again, or go back to the dashboard.
          {error.digest ? (
            <span className="mt-2 block font-mono text-xs">Reference {error.digest}</span>
          ) : null}
        </>
      }
    >
      <button type="button" onClick={() => retry()} className="solid-button">
        Try again
      </button>
      <Link href="/" className="ghost-button">
        Back to the dashboard
      </Link>
      <a href={`${siteUrl()}/docs`} className="ghost-button">
        Read the docs
      </a>
    </StatusPage>
  );
}
