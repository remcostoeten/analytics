import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { readRealtime } from "@/modules/analytics/actions";
import { RealtimePanel } from "@/modules/analytics/components/realtime-panel";
import { findProject } from "@/modules/analytics/reads";
import { readSession } from "@/modules/session/session";

type Props = { params: Promise<{ project: string }> };

export const metadata: Metadata = { title: "Realtime" };

export default async function Page({ params }: Props) {
  const { project } = await params;
  const [found, session, initial] = await Promise.all([
    findProject(project),
    readSession(),
    readRealtime(project),
  ]);
  if (!found) notFound();
  const base = `/projects/${encodeURIComponent(project)}`;

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-3xl tracking-tight">Realtime for {found.name}</h1>
        <span className="font-mono text-xs text-muted">{found.domain}</span>
      </header>
      <RealtimePanel
        project={project}
        initial={initial}
        base={base}
        canFollow={session.user !== null}
      />
    </div>
  );
}
