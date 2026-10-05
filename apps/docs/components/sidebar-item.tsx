"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import { SidebarItem, useFolderDepth } from "fumadocs-ui/components/sidebar/base";
import { usePathname } from "next/navigation";

const itemClass =
  "relative flex flex-row items-center gap-2 py-1.5 pe-2 text-start text-[0.8125rem] text-fd-muted-foreground wrap-anywhere [&_svg]:size-3.5 [&_svg]:shrink-0";

const linkClass =
  "transition-colors hover:text-fd-foreground data-[active=true]:text-fd-foreground data-[active=true]:font-medium";

const highlightClass =
  "before:absolute before:inset-s-2.5 before:inset-y-0 before:w-px before:bg-transparent before:content-[''] data-[active=true]:before:bg-fd-foreground";

type Props = {
  item: PageTree.Item;
};

export function DocsSidebarItem({ item }: Props) {
  const pathname = usePathname();
  const depth = useFolderDepth();
  const style = { paddingInlineStart: `calc(${2 + 3 * depth} * var(--spacing))` };

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
