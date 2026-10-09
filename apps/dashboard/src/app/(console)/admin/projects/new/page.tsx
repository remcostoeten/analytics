import type { Metadata } from "next";

import { CreateProjectForm } from "@/modules/admin/components/create-project-form";
import { AccessNotice } from "@/modules/session/components/access-notice";
import { readAccess } from "@/modules/session/session";
import { Heading } from "@/shared/ui/heading";

export const metadata: Metadata = { title: "New project" };

export default async function Page() {
  const access = await readAccess();
  if (access.state !== "admin") return <AccessNotice access={access} />;
  return (
    <>
      <Heading title="New project" />
      <CreateProjectForm />
    </>
  );
}
