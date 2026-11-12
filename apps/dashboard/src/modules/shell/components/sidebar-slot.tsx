"use client";

import { useProjects } from "@/modules/analytics/use-projects";
import { useSession } from "@/modules/session/use-session";

import { Sidebar } from "./sidebar";
import { SidebarSkeleton } from "./sidebar-skeleton";

export function SidebarSlot() {
  const projects = useProjects();
  const session = useSession();
  if (projects.status === "loading") return <SidebarSkeleton />;
  return (
    <Sidebar
      projects={projects.status === "ok" ? projects.projects : []}
      isAdmin={session.isAdmin}
      isOwner={session.role === "owner"}
      signedIn={session.user !== null}
    />
  );
}
