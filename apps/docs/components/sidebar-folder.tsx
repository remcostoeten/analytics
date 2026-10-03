"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import { usePathname } from "next/navigation";
import { useEffect, useId, type ReactNode } from "react";

import { sectionIcon } from "@/components/sidebar-icons";
import { setOpenSection, toggleSection, useOpenSection } from "@/lib/sidebar-state";

function containsPath(folder: PageTree.Folder, pathname: string): boolean {
  if (folder.index?.url === pathname) return true;
  return folder.children.some((node) => {
    if (node.type === "page") return node.url === pathname;
    if (node.type === "folder") return containsPath(node, pathname);
    return false;
  });
}

function slugOf(folder: PageTree.Folder) {
  const url = folder.index?.url ?? folder.children.find((node) => node.type === "page")?.url ?? "";
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - (folder.index ? 1 : 2)] ?? "";
}

type Props = {
  item: PageTree.Folder;
  children: ReactNode;
};

export function DocsSidebarFolder({ item, children }: Props) {
  const pathname = usePathname();
  const generated = useId();
  const id = item.$id ?? generated;
  const open = useOpenSection();
  const active = containsPath(item, pathname);

  useEffect(() => {
    if (active) setOpenSection(id);
  }, [active, id]);

  if (item.root) return null;

  const expanded = open === id;
  const Icon = sectionIcon(slugOf(item));

  return (
    <div className="border-b border-line/70">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`${id}-panel`}
        onClick={() => toggleSection(id)}
        className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-[0.875rem] font-medium transition-colors ${
          expanded
            ? "bg-fg/3 text-fd-foreground"
            : "text-fd-foreground/70 hover:bg-fg/3 hover:text-fd-foreground"
        }`}
      >
        <span className="flex size-4 shrink-0 items-center justify-center [&>svg]:size-4">
          {Icon ? <Icon /> : item.icon}
        </span>
        <span className="grow">{item.name}</span>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`size-4 shrink-0 text-fd-muted-foreground transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        id={`${id}-panel`}
        className="section-panel grid"
        data-state={expanded ? "open" : "closed"}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col py-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
