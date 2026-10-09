import type { ReactNode } from "react";

import { listProjects } from "@/modules/analytics/reads";
import { readSession } from "@/modules/session/session";
import { Sidebar } from "@/modules/shell/components/sidebar";
import { TopBar } from "@/modules/shell/components/top-bar";

type Props = { children: ReactNode };

export default async function Layout({ children }: Props) {
  const [projects, session] = await Promise.all([listProjects(), readSession()]);
  return (
    <div className="console">
      <Sidebar
        projects={projects.ok ? projects.value : []}
        isAdmin={session.isAdmin}
        signedIn={session.user !== null}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
