"use client";

import { usePathname } from "next/navigation";

import { Logo } from "@/shared/ui/logo";

import { currentProject, SidebarFoot } from "./sidebar";

function workspaceRows(pathname: string) {
  const admin = pathname.startsWith("/admin");
  if (currentProject(pathname) === null) return 1;
  return admin ? 9 : 5;
}

function NavRows({ count }: { count: number }) {
  return (
    <ul>
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="skeleton h-8 w-24 md:w-auto" />
        </li>
      ))}
    </ul>
  );
}

export function SidebarSkeleton() {
  const pathname = usePathname();
  const admin = pathname.startsWith("/admin");
  return (
    <aside className="sidebar" aria-busy="true">
      <div className="sidebar-panel">
        <div className="sidebar-head">
          <div className="sidebar-brand">
            <Logo className="size-6" />
            <span className="nav-label text-sm font-medium">Spoar</span>
          </div>
          <div className="sidebar-switch">
            <div className="skeleton h-[34px]" />
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="Dashboard" aria-hidden="true">
          <NavRows count={workspaceRows(pathname)} />
          {admin ? (
            <div className="sidebar-group">
              <p className="sidebar-group-label">Manage</p>
              <NavRows count={2} />
            </div>
          ) : null}
        </nav>
        <SidebarFoot />
      </div>
    </aside>
  );
}
