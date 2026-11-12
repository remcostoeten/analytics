"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { projectsKey } from "../use-projects";
import type { ProjectsData } from "../use-projects";

type Props = { projects: ProjectsData };

/**
 * @name ProjectsSync
 * @description Puts a project list a server page just read into the browser's query cache, so
 * the sidebar shows a project that was created, renamed or deleted without asking again.
 *
 * @example
 * <ProjectsSync projects={listed} />
 */
export function ProjectsSync({ projects }: Props) {
  const queryClient = useQueryClient();
  useEffect(() => {
    queryClient.setQueryData(projectsKey, projects);
  }, [queryClient, projects]);
  return null;
}
