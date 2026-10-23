// Matches the API's session cookie, plain or `__Secure-` prefixed, at the start or after another cookie.
const sessionCookie = /(?:^|;\s*)(?:__Secure-)?ra\.session_token=/;

/**
 * @name hasSessionCookie
 * @description Whether a cookie header carries the API's session cookie. Without it the API
 * answers every call as signed out, so server reads for anonymous visitors skip the round trip and
 * share one cached answer instead of asking per request.
 *
 * @example
 * const jar = await cookies();
 * if (!hasSessionCookie(jar.toString())) return signedOut;
 */
export function hasSessionCookie(cookie: string): boolean {
  return sessionCookie.test(cookie);
}
