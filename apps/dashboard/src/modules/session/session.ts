import type { AuthSession } from "@spoar/contract";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";
import { cacheLife } from "next/cache";
import { cookies } from "next/headers";

import { serverClient } from "@/shared/api/server-client";
import { hasSessionCookie } from "@/shared/api/session-cookie";

export type Access =
  | { state: "signed-out" }
  | { state: "unavailable"; message: string }
  | { state: "no-access"; session: AuthSession }
  | { state: "admin"; session: AuthSession };

const signedOut: AuthSession = { user: null, session: null, role: null, isAdmin: false };

async function readMemberSession(): Promise<AuthSession> {
  "use cache: private";
  cacheLife("minutes");
  const api = await serverClient();
  const result = await api.system.session();
  // A thrown error is never cached, so one failed call is not remembered as a signed-out answer.
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

async function askSession(): Promise<Result<AuthSession, string>> {
  try {
    return ok(await readMemberSession());
  } catch (error) {
    return err(error instanceof Error ? error.message : "The API did not answer");
  }
}

/**
 * @name readSessionResult
 * @description Like `readSession`, but a failed API call comes back as an error instead of a
 * signed-out answer, so a page can tell an API outage from a visitor who is not signed in. A
 * failed call is not cached.
 *
 * @example
 * const answer = await readSessionResult();
 * if (!answer.ok) return <p>{answer.error}</p>;
 */
export async function readSessionResult(): Promise<Result<AuthSession, string>> {
  const jar = await cookies();
  return hasSessionCookie(jar.toString()) ? askSession() : ok(signedOut);
}

/**
 * @name readSession
 * @description Asks the API who the forwarded cookie belongs to. Without a session cookie the
 * answer is signed out and the API is not called, so an anonymous page render costs no session
 * read. A failed call reads as signed out, which suits the sign-in page; pages that gate on the
 * session use `readAccess`, which reports the failure. Cached per session for five minutes in the browser, so the admin pages' access
 * checks render with a route's prefetched shell; the top bar and sidebar ask from the browser
 * through `useSessionRead`. Signing out reloads the page.
 *
 * @example
 * const session = await readSession();
 * if (session.isAdmin) showSettings();
 */
export async function readSession(): Promise<AuthSession> {
  const answer = await readSessionResult();
  return answer.ok ? answer.value : signedOut;
}

/**
 * @name readAccess
 * @description The session folded into the states the admin pages render: nobody signed in, a
 * member without admin rights, an owner or admin, or the API not answering.
 *
 * @example
 * const access = await readAccess();
 * if (access.state !== "admin") return <AccessNotice access={access} />;
 */
export async function readAccess(): Promise<Access> {
  const answer = await readSessionResult();
  if (!answer.ok) return { state: "unavailable", message: answer.error };
  const session = answer.value;
  if (session.user === null) return { state: "signed-out" };
  return { state: session.isAdmin ? "admin" : "no-access", session };
}
