import { listProjects } from "@/modules/analytics/reads";
import { projectsKey } from "@/modules/analytics/use-projects";
import { readSession } from "@/modules/session/session";
import { Seed } from "@/shared/query/seed";

import { Sidebar } from "./sidebar";

export async function SidebarSlot() {
  const [projects, session] = await Promise.all([listProjects(), readSession()]);
  const seed = projects.ok ? <Seed queryKey={projectsKey} data={projects} /> : null;
  return (
    <>
      {seed}
      <Sidebar
        projects={projects.ok ? projects.value : []}
        isAdmin={session.isAdmin}
        isOwner={session.role === "owner"}
        signedIn={session.user !== null}
      />
    </>
  );
}
