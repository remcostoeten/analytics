import type { NavLink } from "@/components/landing/site-nav";
import { dashboardUrl } from "@/lib/dashboard-url";
import { listExamples } from "@/lib/examples";

export const githubUrl = "https://github.com/remcostoeten/analytics";

/**
 * @name siteLinks
 * @description The links in the landing header menu and footer, shared by every page outside `/docs`.
 */
export function siteLinks() {
  const links: NavLink[] = [
    { label: "Documentation", href: "/docs" },
    { label: "SDK reference", href: "/docs/sdk/install" },
    { label: "API reference", href: "/docs/reference" },
    { label: "Query", href: "/query" },
  ];
  if (listExamples().length > 0) links.push({ label: "Examples", href: "/examples" });
  links.push({ label: "Changelog", href: "/changelog" });
  links.push(
    { label: "Dashboard", href: dashboardUrl(), external: true },
    { label: "GitHub", href: githubUrl, external: true },
  );
  return links;
}
