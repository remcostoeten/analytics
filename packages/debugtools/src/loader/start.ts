import type { WidgetSession } from "@spoar/contract";
import { noop } from "@spoar/shared/noop";
import type { Nullable } from "@spoar/shared/semantic";

import type { DebugtoolsOptions, WidgetGrant } from "../options";

type Mount = (options: DebugtoolsOptions, grant: Nullable<WidgetGrant>) => () => void;

/**
 * @name requestGrant
 * @description Asks `GET /v2/widget/session` for a widget token, with the session cookie. Resolves
 * to the token and its expiry only on a 200; a network failure and every other status resolve to
 * null, so a signed-out visitor stops here.
 *
 * @example
 * const grant = await requestGrant({ endpoint: "https://api.example.com", project: "site" });
 * if (grant) open(grant.token);
 */
export async function requestGrant(options: DebugtoolsOptions): Promise<Nullable<WidgetGrant>> {
  const send = options.fetch ?? fetch;
  let base = options.endpoint;
  while (base.endsWith("/")) base = base.slice(0, -1);
  const url = `${base}/v2/widget/session?project=${encodeURIComponent(options.project)}`;
  try {
    const response = await send(url, {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (response.status !== 200) return null;
    // The API validates this response against the contract's WidgetSession schema.
    const session = (await response.json()) as WidgetSession;
    return { token: session.token, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}

/**
 * @name startDebugtools
 * @description Runs the admin check and, only when it passes, imports the console chunk through
 * `load` and mounts it with the widget grant. With `auth: "session"` there is no widget check: the
 * host is the dashboard, which already holds the session cookie. Returns a function that cancels
 * a pending start or unmounts the console.
 *
 * @example
 * const stop = startDebugtools(options, () => import("../widget/mount-widget").then((m) => m.mountWidget));
 */
export function startDebugtools(
  options: DebugtoolsOptions,
  load: () => Promise<Mount>,
): () => void {
  let stopped = false;
  let unmount = noop;
  const granted = options.auth === "session" ? Promise.resolve(null) : requestGrant(options);
  void granted
    .then(async (grant) => {
      if (stopped || (options.auth !== "session" && !grant)) return;
      const mount = await load();
      if (!stopped) unmount = mount(options, grant);
    })
    .catch(noop);
  return () => {
    stopped = true;
    unmount();
  };
}
