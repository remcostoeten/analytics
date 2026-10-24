import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ConnectionStatus } from "@/modules/admin/components/connection-status";
import { DeleteProjectPanel } from "@/modules/admin/components/delete-project-panel";
import { KeysPanel } from "@/modules/admin/components/keys-panel";
import { ProjectSettingsForm } from "@/modules/admin/components/project-settings-form";
import { readProject } from "@/modules/admin/reads";
import { AccessNotice } from "@/modules/session/components/access-notice";
import { readAccess } from "@/modules/session/session";
import { ConnectionSkeleton } from "@/modules/shell/components/skeletons";
import { serverClient } from "@/shared/api/server-client";
import { Heading } from "@/shared/ui/heading";
import { Tip } from "@/shared/ui/tip";

type Props = { params: Promise<{ project: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { project } = await params;
  return { title: decodeURIComponent(project) };
}

async function Connection({ project }: { project: string }) {
  const api = await serverClient();
  const overview = await api.project(project).overview();
  return overview.ok ? (
    <ConnectionStatus ingest={overview.value.ingest.last24h} />
  ) : (
    <p className="text-err text-sm">
      Could not load the connection status: {overview.error.message}
    </p>
  );
}

export default async function Page({ params }: Props) {
  const access = await readAccess();
  if (access.state !== "admin") return <AccessNotice access={access} />;
  const { project: id } = await params;
  const found = await readProject(decodeURIComponent(id));
  if (!found.ok) {
    if (found.error.code === "NOT_FOUND") notFound();
    return <p className="text-err text-sm">Could not load the project: {found.error.message}</p>;
  }
  const project = found.value;
  if (!("publicKey" in project)) notFound();
  return (
    <>
      <Heading title={project.name} meta={project.id} />
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="grid content-start gap-4">
          <h2 className="caps text-muted flex items-center gap-1.5">
            Settings
            <Tip label="About settings">
              Choose who can see this project's numbers, which sites may send data and how long it
              is kept.
            </Tip>
          </h2>
          <ProjectSettingsForm project={project} />
        </section>
        <section className="grid content-start gap-4">
          <h2 className="caps text-muted flex items-center gap-1.5">
            Connection
            <Tip label="About the connection">
              Shows whether your site is successfully sending visits to this project right now.
            </Tip>
          </h2>
          <Suspense fallback={<ConnectionSkeleton />}>
            <Connection project={project.id} />
          </Suspense>
          <h2 className="caps text-muted flex items-center gap-1.5">
            Keys
            <Tip label="About keys">
              Keys prove that data really comes from your site. You need them once to connect it.
            </Tip>
          </h2>
          <KeysPanel project={project.id} publicKey={project.publicKey} usage={project.keyUsage} />
          {access.session.role === "owner" ? (
            <DeleteProjectPanel project={project.id} name={project.name} />
          ) : null}
        </section>
      </div>
    </>
  );
}
