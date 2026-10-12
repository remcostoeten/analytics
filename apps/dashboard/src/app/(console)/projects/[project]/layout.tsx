import type { ReactNode } from "react";
import { Suspense } from "react";

import { ProjectConsole } from "@/modules/console/components/project-console";
import { readSession } from "@/modules/session/session";

type Props = { children: ReactNode; params: Promise<{ project: string }> };

async function ConsoleGate({ params }: Pick<Props, "params">) {
  const [{ project }, session] = await Promise.all([params, readSession()]);
  if (session.role === null || session.role === "viewer") return null;
  return <ProjectConsole project={project} />;
}

export default function Layout({ children, params }: Props) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <ConsoleGate params={params} />
      </Suspense>
    </>
  );
}
