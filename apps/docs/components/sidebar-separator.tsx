"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import { useFolderDepth } from "fumadocs-ui/components/sidebar/base";

type Props = {
  item: PageTree.Separator;
};

export function DocsSidebarSeparator({ item }: Props) {
  const depth = useFolderDepth();
  return (
    <p
      className={`caps mt-6 mb-1 inline-flex items-center gap-2 px-2 text-[0.62rem] tracking-[0.04em] text-fd-muted-foreground empty:mb-0 ${depth === 0 ? "first:mt-0" : ""}`}
      style={{ paddingInlineStart: `calc(${2 + 3 * depth} * var(--spacing))` }}
    >
      {item.icon}
      {item.name}
    </p>
  );
}
