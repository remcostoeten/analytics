import type { AuthSession } from "@spoar/contract";
import { useQuery } from "@tanstack/react-query";

import { browserClient } from "@/shared/api/browser-client";

const sessionKey = ["spoar", "session"] as const;

const signedOut: AuthSession = { user: null, session: null, role: null, isAdmin: false };

const sessionStaleMs = 5 * 60_000;

export type SessionRead = { known: boolean; session: AuthSession };

/**
 * @name useSessionRead
 * @description Who the browser's cookie belongs to, asked from the browser and refreshed every
 * five minutes, with whether the answer has arrived. The shell waits for `known` before it shows
 * the sign-in link, so a signed-in reload never flashes it.
 *
 * @example
 * const { known, session } = useSessionRead();
 * if (!known) return <Skeleton />;
 */
export function useSessionRead(): SessionRead {
  const read = useQuery({
    queryKey: sessionKey,
    queryFn: async () => {
      const result = await browserClient().system.session();
      return result.ok ? result.value : signedOut;
    },
    staleTime: sessionStaleMs,
  });
  return { known: read.data !== undefined, session: read.data ?? signedOut };
}

/**
 * @name useSession
 * @description Who the browser's cookie belongs to, shared with the shell's read. Until the first
 * answer the session reads as signed out, so admin controls appear once it is known and never
 * flash on for a viewer.
 *
 * @example
 * const session = useSession();
 * if (session.isAdmin) showAnnotate();
 */
export function useSession(): AuthSession {
  return useSessionRead().session;
}
