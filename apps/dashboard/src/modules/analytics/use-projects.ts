import type { PublicProject } from "@spoar/contract";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import { useQuery } from "@tanstack/react-query";

import { browserClient } from "@/shared/api/browser-client";

export const projectsKey = ["spoar", "projects"] as const;

export type ProjectsRead =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; projects: PublicProject[] };

const projectsStaleMs = 5 * 60_000;

/**
 * @name useProjects
 * @description Every project the browser may read, from the cache the sidebar seeds on the
 * server, refreshed every five minutes.
 *
 * @example
 * const projects = useProjects();
 * if (projects.status === "ok") list(projects.projects);
 */
export function useProjects(): ProjectsRead {
  const read = useQuery({
    queryKey: projectsKey,
    queryFn: async (): Promise<Result<PublicProject[], string>> => {
      const listed = await browserClient().projects.list();
      return listed.ok ? ok(listed.value.data) : err(listed.error.message);
    },
    staleTime: projectsStaleMs,
  });
  if (read.data === undefined) return { status: "loading" };
  return read.data.ok
    ? { status: "ok", projects: read.data.value }
    : { status: "error", message: read.data.error };
}

export type ProjectRead =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ok"; project: PublicProject };

/**
 * @name useProject
 * @description One project out of the readable list: loading until the list is known, missing
 * when it is not in it, which a page turns into its not-found view.
 *
 * @example
 * const found = useProject("skriuw");
 * if (found.status === "missing") notFound();
 */
export function useProject(id: string): ProjectRead {
  const projects = useProjects();
  if (projects.status !== "ok") return { status: "loading" };
  const project = projects.projects.find((entry) => entry.id === id);
  return project ? { status: "ok", project } : { status: "missing" };
}
