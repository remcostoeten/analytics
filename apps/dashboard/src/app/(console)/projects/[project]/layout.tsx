import type { ReactNode } from "react";

import { ProjectConsole } from "@/modules/console/components/project-console";
import { readSession } from "@/modules/session/session";

type Props = { children: ReactNode; params: Promise<{ project: string }> };

export default async function Layout({ children, params }: Props) {
  const [{ project }, session] = await Promise.all([params, readSession()]);
  const canQuery = session.role !== null && session.role !== "viewer";

  return (
    <>
      {children}
      {canQuery ? <ProjectConsole project={project} /> : null}
    </>
  );
}
