import { serverClient } from "@/shared/api/server-client";

/**
 * @name GET
 * @description Whether the request's session cookie belongs to a signed-in user, for the landing
 * site's nav, which reaches this route same-origin through the `/dashboard` rewrite. It answers
 * a boolean only and is never cached.
 *
 * @example
 * const { signedIn } = await (await fetch("/dashboard/session")).json();
 */
export async function GET() {
  const api = await serverClient();
  const result = await api.system.session();
  const signedIn = result.ok && result.value.user !== null;
  return Response.json({ signedIn }, { headers: { "cache-control": "private, no-store" } });
}
