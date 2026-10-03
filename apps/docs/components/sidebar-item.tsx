"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import { SidebarItem, useFolderDepth } from "fumadocs-ui/components/sidebar/base";
import { usePathname } from "next/navigation";

import { pageIcon } from "@/components/sidebar-icons";

const comingSoon = new Set([
  "/docs/frameworks/vue",
  "/docs/frameworks/svelte",
  "/docs/frameworks/astro",
]);

const rowClass =
  "relative flex w-full items-center gap-2.5 py-1 pe-4 text-[0.875rem] transition-colors duration-150 [&>svg]:size-3.5 [&>svg]:shrink-0";

type Props = {
  item: PageTree.Item;
};

function slugOf(url: string) {
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? "";
}

export function DocsSidebarItem({ item }: Props) {
  const pathname = usePathname();
  const depth = useFolderDepth();
  const nested = depth >= 1;
  const Icon = pageIcon(slugOf(item.url));
  const indent = nested ? "ps-11 text-[0.8125rem]" : "ps-4";

  if (comingSoon.has(item.url)) {
    return (
      <span
        aria-disabled="true"
        title="Coming soon"
        className={`${rowClass} ${indent} cursor-not-allowed text-fd-muted-foreground/50 select-none`}
      >
        {Icon ? <Icon /> : <span className="size-3.5 shrink-0" />}
        <span className="grow">{item.name}</span>
        <span className="caps text-[0.55rem]">Soon</span>
      </span>
    );
  }

  const active = pathname === item.url;

  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      active={active}
      className={`${rowClass} ${indent} ${
        active
          ? "bg-fg/6 text-fd-foreground"
          : "text-fd-foreground/65 hover:bg-fg/3 hover:text-fd-foreground/90"
      }`}
    >
      {Icon ? <Icon /> : <span className="size-3.5 shrink-0" />}
      <span className="min-w-0 grow truncate">{item.name}</span>
    </SidebarItem>
  );
}
