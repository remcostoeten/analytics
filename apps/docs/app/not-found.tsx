import type { Metadata } from "next";
import Link from "next/link";

import { SiteShell } from "@/components/landing/site-shell";
import { StatusPage } from "@/components/landing/status-page";
import { dashboardUrl } from "@/lib/dashboard-url";

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <SiteShell>
      <StatusPage
        eyebrow="404"
        title="This page does not exist"
        description="The address may be mistyped, or the page moved. The docs, the changelog and the dashboard are all one click away."
      >
        <Link href="/" className="pill-dark px-5! py-2.5!">
          Back to home
        </Link>
        <Link href="/docs" className="pill-ghost px-4! py-2.5!">
          Read the docs
        </Link>
        <Link href="/changelog" className="pill-ghost px-4! py-2.5!">
          Changelog
        </Link>
        <a href={dashboardUrl()} className="pill-ghost px-4! py-2.5!">
          Open the dashboard
        </a>
      </StatusPage>
    </SiteShell>
  );
}
