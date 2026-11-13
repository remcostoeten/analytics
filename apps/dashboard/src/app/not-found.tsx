import type { Metadata } from "next";

import { StatusPage } from "@/modules/shell/components/status-page";
import { siteUrl } from "@/shared/config/site";
import { Link } from "@/shared/ui/link";

export const metadata: Metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <StatusPage
      eyebrow="404"
      title="Page not found"
      description="There is nothing at this address in the dashboard. It may be mistyped, or the page moved."
    >
      <Link href="/" className="solid-button">
        Back to the dashboard
      </Link>
      <a href={`${siteUrl()}/docs`} className="ghost-button">
        Read the docs
      </a>
    </StatusPage>
  );
}
