"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  useFolderDepth,
} from "fumadocs-ui/components/sidebar/base";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function containsPath(folder: PageTree.Folder, pathname: string): boolean {
  if (folder.index?.url === pathname) return true;
  return folder.children.some((node) => {
    if (node.type === "page") return node.url === pathname;
    if (node.type === "folder") return containsPath(node, pathname);
    return false;
  });
}

type Props = {
  item: PageTree.Folder;
  children: ReactNode;
};

const itemClass =
  "relative flex w-full flex-row items-center gap-2 py-1.5 pe-2 text-start text-[0.8125rem] text-fd-muted-foreground wrap-anywhere transition-colors hover:text-fd-foreground data-[active=true]:font-medium data-[active=true]:text-fd-foreground [&_svg]:size-3.5 [&_svg]:shrink-0";

export function DocsSidebarFolder({ item, children }: Props) {
  const pathname = usePathname();
  const depth = useFolderDepth();

  if (item.root) return null;

  const style = { paddingInlineStart: `calc(${2 + 3 * depth} * var(--spacing))` };
  const active = containsPath(item, pathname);

  return (
    <SidebarFolder
      collapsible={item.collapsible}
      defaultOpen={item.defaultOpen || active}
      active={active}
    >
      {item.index ? (
        <SidebarFolderLink
          href={item.index.url}
          active={pathname === item.index.url}
          className={itemClass}
          style={style}
        >
          {item.icon}
          {item.name}
        </SidebarFolderLink>
      ) : (
        <SidebarFolderTrigger className={itemClass} style={style}>
          {item.icon}
          {item.name}
        </SidebarFolderTrigger>
      )}
      <SidebarFolderContent className="relative before:absolute before:inset-s-2.5 before:inset-y-0 before:w-px before:bg-fd-border before:content-['']">
        <div className="flex flex-col">{children}</div>
      </SidebarFolderContent>
    </SidebarFolder>
  );
}
