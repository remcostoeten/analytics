import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { readRealtime } from "@/modules/analytics/actions";
import { RealtimePanel } from "@/modules/analytics/components/realtime-panel";
import { findProject } from "@/modules/analytics/reads";
import { readSession } from "@/modules/session/session";
import { RealtimeBodySkeleton } from "@/modules/shell/components/skeletons";

type Props = { params: Promise<{ project: string }> };

export const metadata: Metadata = { title: "Realtime" };

async function Panel({ project }: { project: string }) {
  const [session, initial] = await Promise.all([readSession(), readRealtime(project)]);
  return (
    <RealtimePanel
      project={project}
      initial={initial}
      base={`/projects/${encodeURIComponent(project)}`}
      canFollow={session.user !== null}
    />
  );
}

export default async function Page({ params }: Props) {
  const { project } = await params;
  const found = await findProject(project);
  if (!found) notFound();

  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-serif text-3xl tracking-tight">Realtime for {found.name}</h1>
        <span className="font-mono text-xs text-muted">{found.domain}</span>
      </header>
      <Suspense fallback={<RealtimeBodySkeleton />}>
        <Panel project={project} />
      </Suspense>
    </div>
  );
}
