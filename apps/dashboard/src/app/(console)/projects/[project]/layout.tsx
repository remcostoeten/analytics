import type { ReactNode } from "react";
import { Suspense } from "react";

import { ProjectConsole } from "@/modules/console/components/project-console";
import { readSession } from "@/modules/session/session";

type Props = { children: ReactNode; params: Promise<{ project: string }> };

async function Console({ params }: Pick<Props, "params">) {
  const [{ project }, session] = await Promise.all([params, readSession()]);
  const canQuery = session.role !== null && session.role !== "viewer";
  return canQuery ? <ProjectConsole project={project} /> : null;
}

export default function Layout({ children, params }: Props) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <Console params={params} />
      </Suspense>
    </>
  );
}
