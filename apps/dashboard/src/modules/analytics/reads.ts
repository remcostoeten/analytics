import type { ProjectList } from "@spoar/contract";
import { createClient } from "@spoar/client";
import type { Client } from "@spoar/client";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import { cacheLife } from "next/cache";
import { cookies } from "next/headers";

import { apiEndpoint } from "@/shared/api/endpoint";
import { serverClient } from "@/shared/api/server-client";
import { hasSessionCookie } from "@/shared/api/session-cookie";

type Projects = Result<ProjectList["data"], string>;

function projectsOf(listed: Awaited<ReturnType<Client<string>["projects"]["list"]>>): Projects {
  return listed.ok ? ok(listed.value.data) : err(listed.error.message);
}

async function listPublicProjects(): Promise<Projects> {
  "use cache";
  cacheLife("minutes");
  return projectsOf(await createClient({ endpoint: apiEndpoint() }).projects.list());
}

async function listMemberProjects(): Promise<Projects> {
  "use cache: private";
  cacheLife("minutes");
  const api = await serverClient();
  return projectsOf(await api.projects.list());
}

/**
 * @name listProjects
 * @description Every project the caller may read: public ones when signed out, private ones too
 * for members, with every setting for admins. The public list is read without a cookie and shared
 * by every anonymous visitor for a minute, so a crawler walking the public pages does not list the
 * projects once per page. A member's list is cached per session for five minutes in the browser,
 * so the sidebar and headings render with a route's prefetched shell. A server action that
 * revalidates clears it.
 *
 * @example
 * const projects = await listProjects();
 */
export async function listProjects(): Promise<Projects> {
  const jar = await cookies();
  return hasSessionCookie(jar.toString()) ? listMemberProjects() : listPublicProjects();
}
