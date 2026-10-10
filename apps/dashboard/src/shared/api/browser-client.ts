import { createClient } from "@spoar/client";
import type { Client } from "@spoar/client";

import { apiEndpoint } from "./endpoint";
import { withCredentials } from "./with-credentials";

let shared: Client<string> | null = null;

/**
 * @name browserClient
 * @description The typed API client for client components. It sends the session cookie with every
 * request, so signed-in reads see private projects and detail routes, and is created once per tab.
 *
 * @example
 * const scope = browserClient().project(project);
 * useQuery({ queryKey: scope.key("realtime"), queryFn: () => scope.realtime() });
 */
export function browserClient(): Client<string> {
  shared ??= createClient({ endpoint: apiEndpoint(), fetch: withCredentials() });
  return shared;
}
