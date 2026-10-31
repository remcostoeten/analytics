"use client";

import { notFound } from "next/navigation";

import { useProject } from "@/modules/analytics/use-projects";

type Props = { project: string };

export function ProjectDomain({ project }: Props) {
  const found = useProject(project);
  if (found.status === "missing") notFound();
  if (found.status === "loading") return null;
  return <span className="font-mono text-xs text-muted">{found.project.domain}</span>;
}
