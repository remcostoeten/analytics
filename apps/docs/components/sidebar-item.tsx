"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import { SidebarItem, useFolderDepth } from "fumadocs-ui/components/sidebar/base";
import { motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";

const itemClass =
  "group/item relative isolate flex flex-row items-center gap-2.5 rounded-md py-1.5 pe-2 text-start text-[0.8125rem] text-fd-muted-foreground wrap-anywhere transition-colors duration-150 hover:text-fd-foreground data-[active=true]:font-medium data-[active=true]:text-fd-foreground [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:transition-transform [&_svg]:duration-200 hover:[&_svg]:scale-110";

type Props = {
  item: PageTree.Item;
};

export function DocsSidebarItem({ item }: Props) {
  const pathname = usePathname();
  const depth = useFolderDepth();
  const reduced = useReducedMotion();
  const active = pathname === item.url;
  const style = { paddingInlineStart: `calc(${2 + 3 * depth} * var(--spacing))` };

  return (
    <SidebarItem
      href={item.url}
      external={item.external}
      active={active}
      icon={item.icon}
      style={style}
      className={itemClass}
    >
      {active ? (
        <motion.span
          layoutId="docs-sidebar-active"
          className="absolute inset-y-0 inset-s-1 inset-e-0 -z-10 rounded-md bg-fd-accent"
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 40 }}
        />
      ) : null}
      {item.name}
    </SidebarItem>
  );
}
