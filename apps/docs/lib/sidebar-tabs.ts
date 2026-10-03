import type * as PageTree from "fumadocs-core/page-tree";
import type { LayoutTab } from "fumadocs-ui/layouts/shared";

function collectUrls(nodes: PageTree.Node[], into: Set<string>) {
  for (const node of nodes) {
    if (node.type === "page") into.add(node.url);
    if (node.type === "folder" && !node.root) {
      if (node.index) into.add(node.index.url);
      collectUrls(node.children, into);
    }
  }
}

export function sidebarTabs(tree: PageTree.Root): LayoutTab[] {
  const docsUrls = new Set<string>();
  collectUrls(tree.children, docsUrls);
  const roots = tree.children.filter((node) => node.type === "folder" && node.root);
  const tabs: LayoutTab[] = [{ title: "Docs", url: "/docs", urls: docsUrls }];
  for (const folder of roots) {
    if (folder.type !== "folder") continue;
    const url = folder.index?.url;
    if (!url) continue;
    const urls = new Set<string>([url]);
    collectUrls(folder.children, urls);
    tabs.push({ title: folder.name, url, urls });
  }
  return tabs;
}
