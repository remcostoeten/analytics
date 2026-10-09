import type { AuthSession } from "@spoar/contract";
import { cache } from "react";

import { serverClient } from "@/shared/api/server-client";

export type Access =
  | { state: "signed-out" }
  | { state: "no-access"; session: AuthSession }
  | { state: "admin"; session: AuthSession };

const signedOut: AuthSession = { user: null, session: null, role: null, isAdmin: false };

async function fetchSession(): Promise<AuthSession> {
  const api = await serverClient();
  const result = await api.system.session();
  return result.ok ? result.value : signedOut;
}

/**
 * @name readSession
 * @description Asks the API who the forwarded cookie belongs to. A failed call reads as signed
 * out, so the page renders the sign-in prompt instead of an error. Runs once per request.
 *
 * @example
 * const session = await readSession();
 * if (session.isAdmin) showSettings();
 */
export const readSession = cache(fetchSession);

/**
 * @name readAccess
 * @description The session folded into the three states the admin pages render: nobody signed
 * in, a member without admin rights, or an owner or admin.
 *
 * @example
 * const access = await readAccess();
 * if (access.state !== "admin") return <AccessNotice access={access} />;
 */
export async function readAccess(): Promise<Access> {
  const session = await readSession();
  if (session.user === null) return { state: "signed-out" };
  return { state: session.isAdmin ? "admin" : "no-access", session };
}
