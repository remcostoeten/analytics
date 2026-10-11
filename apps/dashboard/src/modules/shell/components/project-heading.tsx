import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { findProject } from "@/modules/analytics/reads";

import { ProjectHeader } from "./project-header";

type Props = {
  project: string;
  title: string;
  live?: { project: string; href: string };
  children: ReactNode;
};

async function Resolved({ project, title, live, children }: Props) {
  const found = await findProject(project);
  if (!found) notFound();
  return (
    <ProjectHeader title={`${title} ${found.name}`} domain={found.domain} live={live}>
      {children}
    </ProjectHeader>
  );
}

export function ProjectHeading(props: Props) {
  return (
    <Suspense
      fallback={
        <header className="panel-section panel-head grid gap-3">
          <div className="skeleton h-9 w-72 max-w-full" aria-hidden="true" />
          {props.children}
        </header>
      }
    >
      <Resolved {...props} />
    </Suspense>
  );
}
