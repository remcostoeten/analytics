"use client";

import { useParams } from "next/navigation";

import { useSession } from "@/modules/session/use-session";

import { ProjectConsole } from "./project-console";

export function ProjectConsoleSlot() {
  const { project } = useParams<{ project: string }>();
  const { role } = useSession();
  if (role === null || role === "viewer") return null;
  return <ProjectConsole project={project} />;
}
