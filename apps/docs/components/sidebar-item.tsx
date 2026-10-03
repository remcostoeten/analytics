"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import { SidebarItem, useFolderDepth } from "fumadocs-ui/components/sidebar/base";
import { usePathname } from "next/navigation";

const comingSoon = new Set([
  "/docs/frameworks/vue",
  "/docs/frameworks/svelte",
  "/docs/frameworks/astro",
]);

const itemClass =
  "relative flex flex-row items-center gap-2 rounded-lg p-2 text-start text-fd-muted-foreground wrap-anywhere [&_svg]:size-4 [&_svg]:shrink-0";

const linkClass =
  "transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80 data-[active=true]:bg-fd-primary/10 data-[active=true]:text-fd-primary";

const highlightClass =
  "data-[active=true]:before:content-[''] data-[active=true]:before:bg-fd-primary data-[active=true]:before:absolute data-[active=true]:before:w-px data-[active=true]:before:inset-y-2.5 data-[active=true]:before:inset-s-2.5";

type Props = {
  item: PageTree.Item;
};

export function DocsSidebarItem({ item }: Props) {
  const pathname = usePathname();
  const depth = useFolderDepth();
  const style = { paddingInlineStart: `calc(${2 + 3 * depth} * var(--spacing))` };

  if (comingSoon.has(item.url)) {
    return (
      <span
        aria-disabled="true"
        title="Coming soon"
        style={style}
        className={`${itemClass} cursor-not-allowed justify-between text-fd-muted-foreground/50 select-none`}
      >
        {item.name}
        <span className="caps text-[0.55rem]">Soon</span>
      </span>
    );
  }

  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      active={pathname === item.url}
      icon={item.icon}
      style={style}
      className={`${itemClass} ${linkClass} ${depth >= 1 ? highlightClass : ""}`}
    >
      {item.name}
    </SidebarItem>
  );
}
