"use client";

import { notFound } from "next/navigation";

import { useSession } from "@/modules/session/use-session";

import { useProject } from "../use-projects";
import { useProjectView } from "../use-view";
import { RealtimePanel } from "./realtime-panel";

export function RealtimeView() {
  const { project, base } = useProjectView();
  const found = useProject(project);
  const session = useSession();
  if (found.status === "missing") notFound();
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6">
      {found.status === "ok" ? (
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-3xl tracking-tight">Realtime for {found.project.name}</h1>
          <span className="font-mono text-xs text-muted">{found.project.domain}</span>
        </header>
      ) : (
        <div className="skeleton h-9 w-72 max-w-full" aria-hidden="true" />
      )}
      <RealtimePanel project={project} base={base} canFollow={session.user !== null} />
    </div>
  );
}
