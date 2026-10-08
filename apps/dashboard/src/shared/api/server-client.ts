import { createClient } from "@spoar/client";
import type { Client } from "@spoar/client";
import { cookies } from "next/headers";

import { apiEndpoint } from "./endpoint";
import { withCookie } from "./forward-cookie";

/**
 * @name serverClient
 * @description The typed API client for server components and server actions. It forwards the
 * request's cookies, so the API sees the same session the browser signed in with.
 *
 * @example
 * const api = await serverClient();
 * const projects = await api.projects.list();
 */
export async function serverClient(): Promise<Client<string>> {
  const jar = await cookies();
  return createClient({ endpoint: apiEndpoint(), fetch: withCookie(jar.toString()) });
}
