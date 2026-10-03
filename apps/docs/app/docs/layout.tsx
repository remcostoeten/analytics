import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

import { DocsSidebarFolder } from "@/components/sidebar-folder";
import { DocsSidebarItem } from "@/components/sidebar-item";
import { DocsSidebarSeparator } from "@/components/sidebar-separator";
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
        components: {
          Item: DocsSidebarItem,
          Folder: DocsSidebarFolder,
          Separator: DocsSidebarSeparator,
        },
      }}
    >
      {children}
    </DocsLayout>
  );
}
