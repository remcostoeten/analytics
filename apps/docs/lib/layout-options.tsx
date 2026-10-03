import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

import { Logo } from "@/components/logo";

export function baseOptions(): BaseLayoutProps {
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
    links: [
      { text: "Docs", url: "/docs", active: "nested-url", on: "nav" },
      { text: "SDK", url: "/docs/sdk/install", active: "nested-url", on: "nav" },
      { text: "API reference", url: "/docs/reference", active: "nested-url", on: "nav" },
      { text: "Query", url: "/query", active: "nested-url", on: "nav" },
    ],
  };
}
