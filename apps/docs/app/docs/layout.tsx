import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

import { FontPicker } from "@/components/font-picker";
import { DocsSidebarFolder } from "@/components/sidebar-folder";
import { DocsSidebarItem } from "@/components/sidebar-item";
import { DocsSidebarSeparator } from "@/components/sidebar-separator";
import { SidebarShortcut } from "@/components/sidebar-shortcut";
import { baseOptions } from "@/lib/layout-options";
import { sidebarTabs } from "@/lib/sidebar-tabs";
import { source } from "@/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  const tree = source.getPageTree();
  return (
    <DocsLayout
      tree={tree}
      {...baseOptions()}
      tabs={sidebarTabs(tree)}
      sidebar={{
        footer: <FontPicker />,
        components: {
          Item: DocsSidebarItem,
          Folder: DocsSidebarFolder,
          Separator: DocsSidebarSeparator,
        },
      }}
    >
      <SidebarShortcut />
      {children}
    </DocsLayout>
  );
}
