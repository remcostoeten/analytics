import type { BaseLayoutProps, LinkItemType } from "fumadocs-ui/layouts/shared";

import { Logo } from "@/components/logo";
import { listExamples } from "@/lib/examples";

export function baseOptions(): BaseLayoutProps {
  const links: LinkItemType[] = [
    { text: "Docs", url: "/docs", active: "nested-url", on: "nav" },
    { text: "SDK", url: "/docs/sdk/install", active: "nested-url", on: "nav" },
    { text: "API reference", url: "/docs/reference", active: "nested-url", on: "nav" },
    { text: "Query", url: "/query", active: "nested-url", on: "nav" },
  ];
  if (listExamples().length > 0) {
    links.push({ text: "Examples", url: "/examples", active: "nested-url", on: "nav" });
  }
  links.push({ text: "Changelog", url: "/changelog", active: "nested-url", on: "nav" });
  return {
    githubUrl: "https://github.com/remcostoeten/analytics",
    nav: {
      title: (
        <span className="flex items-center gap-2 font-medium tracking-tight">
          <Logo className="size-5" />
          Spoar
        </span>
      ),
      transparentMode: "top",
    },
    links,
  };
}
