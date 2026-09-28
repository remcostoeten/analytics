import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: "Analytics" },
    links: [
      { text: "Docs", url: "/docs" },
      { text: "Query", url: "/query" },
    ],
  };
}
