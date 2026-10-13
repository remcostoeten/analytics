import type { BaseLayoutProps, LinkItemType } from "fumadocs-ui/layouts/shared";

import Image from "next/image";
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
        <span className="flex items-center gap-2.5 font-medium tracking-tight">
          <Image src="/brand/drop-mark.svg" alt="" width={36} height={36} className="shrink-0" />
          <span className="flex flex-col gap-0.5">
            <span className="text-base">Spoar</span>
            <span className="text-[0.625rem] font-normal tracking-[0.08em] text-fd-muted-foreground uppercase">
              Documentation
            </span>
          </span>
        </span>
      ),
      transparentMode: "top",
    },
    links,
  };
}
