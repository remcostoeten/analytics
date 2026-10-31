import type { AuthSession } from "@spoar/contract";
import { useQuery } from "@tanstack/react-query";

import { browserClient } from "@/shared/api/browser-client";

export const sessionKey = ["spoar", "session"] as const;

const signedOut: AuthSession = { user: null, session: null, role: null, isAdmin: false };

const sessionStaleMs = 5 * 60_000;

/**
 * @name useSession
 * @description Who the browser's cookie belongs to, from the query cache the top bar seeds on the
 * server, refreshed every five minutes. Until the first answer the session reads as signed out,
 * so admin controls appear once it is known and never flash on for a viewer.
 *
 * @example
 * const session = useSession();
 * if (session.isAdmin) showAnnotate();
 */
export function useSession(): AuthSession {
  const read = useQuery({
    queryKey: sessionKey,
    queryFn: async () => {
      const result = await browserClient().system.session();
      return result.ok ? result.value : signedOut;
    },
    staleTime: sessionStaleMs,
  });
  return read.data ?? signedOut;
}
