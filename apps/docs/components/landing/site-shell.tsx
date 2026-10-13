import type { ReactNode } from "react";

import { dashboardUrl } from "@/lib/dashboard-url";
import { siteLinks } from "@/lib/site-links";

import { serif } from "./serif";
import { SiteNav } from "./site-nav";

type Props = {
  children: ReactNode;
};

export function SiteShell({ children }: Props) {
  return (
    <div className={`landing ${serif.variable} flex min-h-screen flex-col bg-surface text-fg`}>
      <SiteNav links={siteLinks()} loginHref={dashboardUrl("/sign-in")} />
      <div className="flex flex-1 flex-col pt-20">{children}</div>
    </div>
  );
}
