import { listProjects } from "@/modules/analytics/reads";
import { readSession } from "@/modules/session/session";

import { Sidebar } from "./sidebar";

export async function SidebarSlot() {
  const [projects, session] = await Promise.all([listProjects(), readSession()]);
  return (
    <Sidebar
      projects={projects.ok ? projects.value : []}
      isAdmin={session.isAdmin}
      isOwner={session.role === "owner"}
      signedIn={session.user !== null}
    />
  );
}
