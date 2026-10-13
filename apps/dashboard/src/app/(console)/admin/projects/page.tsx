import type { Project, PublicProject } from "@spoar/contract";
import type { Metadata } from "next";
import { Link } from "@/shared/ui/link";

import { ProjectList } from "@/modules/admin/components/project-list";
import { listProjects } from "@/modules/analytics/reads";
import { AccessNotice } from "@/modules/session/components/access-notice";
import { readAccess } from "@/modules/session/session";
import { Heading } from "@/shared/ui/heading";

export const metadata: Metadata = { title: "Projects" };

function withSettings(project: Project | PublicProject): project is Project {
  return "publicKey" in project;
}

export default async function Page() {
  const access = await readAccess();
  if (access.state !== "admin") return <AccessNotice access={access} />;
  const listed = await listProjects();
  if (!listed.ok) {
    return <p className="text-err text-sm">Could not list projects: {listed.error}</p>;
  }
  const projects = listed.value.filter(withSettings);
  return (
    <>
      <Heading
        title="Projects"
        meta={`${projects.length} project${projects.length === 1 ? "" : "s"}`}
      >
        <Link
          href="/admin/projects/new"
          className="caps inline-flex h-8 items-center rounded-md bg-fg px-3 text-bg hover:bg-accent hover:text-white"
        >
          New project
        </Link>
      </Heading>
      <ProjectList projects={projects} />
    </>
  );
}
