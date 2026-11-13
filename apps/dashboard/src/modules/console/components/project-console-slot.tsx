"use client";

import { useParams } from "next/navigation";

import { useProject } from "@/modules/analytics/use-projects";
import { useSession } from "@/modules/session/use-session";

import { ProjectConsole } from "./project-console";

export function ProjectConsoleSlot() {
  const { project } = useParams<{ project: string }>();
  const { role } = useSession();
  const found = useProject(project);
  if (role === null || role === "viewer" || found.status === "missing") return null;
  return <ProjectConsole project={project} />;
}
