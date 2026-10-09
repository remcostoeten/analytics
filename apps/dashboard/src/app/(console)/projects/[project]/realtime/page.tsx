import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { readRealtime } from "@/modules/analytics/actions";
import { RealtimePanel } from "@/modules/analytics/components/realtime-panel";
import { listProjects } from "@/modules/analytics/reads";
import { readSession } from "@/modules/session/session";

type Props = { params: Promise<{ project: string }> };

export const metadata: Metadata = { title: "Realtime" };

export default async function Page({ params }: Props) {
  const { project } = await params;
  const [projects, session] = await Promise.all([listProjects(), readSession()]);
  const found = projects.ok ? projects.value.find((entry) => entry.id === project) : undefined;
  if (!found) notFound();
  const initial = await readRealtime(project);
  const base = `/projects/${encodeURIComponent(project)}`;

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-normal tracking-tight">Realtime for {found.name}</h1>
        <span className="font-mono text-xs text-muted">{found.domain}</span>
      </header>
      <RealtimePanel
        project={project}
        initial={initial}
        detailHref={(visitor) => `${base}/visitors/${encodeURIComponent(visitor)}`}
        sessionHref={(id) => `${base}/sessions/${encodeURIComponent(id)}`}
        canFollow={session.user !== null}
      />
    </div>
  );
}
