import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DeleteProjectPanel } from "@/modules/admin/components/delete-project-panel";
import { KeysPanel } from "@/modules/admin/components/keys-panel";
import { ProjectSettingsForm } from "@/modules/admin/components/project-settings-form";
import { AccessNotice } from "@/modules/session/components/access-notice";
import { readAccess } from "@/modules/session/session";
import { serverClient } from "@/shared/api/server-client";
import { Heading } from "@/shared/ui/heading";

type Props = { params: Promise<{ project: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { project } = await params;
  return { title: decodeURIComponent(project) };
}

export default async function Page({ params }: Props) {
  const access = await readAccess();
  if (access.state !== "admin") return <AccessNotice access={access} />;
  const { project: id } = await params;
  const api = await serverClient();
  const found = await api.projects.get(decodeURIComponent(id));
  if (!found.ok) {
    if (found.error.code === "NOT_FOUND") notFound();
    return <p className="text-err text-sm">Could not load the project: {found.error.message}</p>;
  }
  const project = found.value.data;
  if (!("publicKey" in project)) notFound();
  return (
    <>
      <Heading title={project.name} meta={project.id} />
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="grid content-start gap-4">
          <h2 className="caps text-muted">Settings</h2>
          <ProjectSettingsForm project={project} />
        </section>
        <section className="grid content-start gap-4">
          <h2 className="caps text-muted">Keys</h2>
          <KeysPanel project={project.id} publicKey={project.publicKey} />
          {access.session.role === "owner" ? (
            <DeleteProjectPanel project={project.id} name={project.name} />
          ) : null}
        </section>
      </div>
    </>
  );
}
