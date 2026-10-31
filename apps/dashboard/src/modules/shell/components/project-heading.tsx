"use client";

import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { useProject } from "@/modules/analytics/use-projects";

import { ProjectHeader } from "./project-header";

type Props = {
  project: string;
  title: string;
  live?: { project: string; href: string };
  children: ReactNode;
};

export function ProjectHeading({ project, title, live, children }: Props) {
  const found = useProject(project);
  if (found.status === "missing") notFound();
  if (found.status === "loading") {
    return (
      <header className="panel-section panel-head grid gap-3">
        <div className="skeleton h-9 w-72 max-w-full" aria-hidden="true" />
        {children}
      </header>
    );
  }
  return (
    <ProjectHeader
      title={`${title} ${found.project.name}`}
      domain={found.project.domain}
      live={live}
    >
      {children}
    </ProjectHeader>
  );
}
