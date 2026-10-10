import { noop } from "@spoar/shared/noop";

import type { DebugtoolsOptions } from "../options";

type Mount = (options: DebugtoolsOptions) => () => void;

/**
 * @name isAdmin
 * @description Asks `GET /v2/widget/session` whether the browser holds an admin session for the
 * project, with the session cookie. Resolves to `true` only on a 200; a network failure and
 * every other status resolve to `false`, so a signed-out visitor stops here.
 *
 * @example
 * if (await isAdmin({ endpoint: "https://api.example.com", project: "site" })) open();
 */
export async function isAdmin(options: DebugtoolsOptions): Promise<boolean> {
  const send = options.fetch ?? fetch;
  let base = options.endpoint;
  while (base.endsWith("/")) base = base.slice(0, -1);
  const url = `${base}/v2/widget/session?project=${encodeURIComponent(options.project)}`;
  try {
    const response = await send(url, {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * @name startDebugtools
 * @description Runs the admin check and, only when it passes, imports the console chunk through
 * `load` and mounts it. Returns a function that cancels a pending start or unmounts the console.
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
  void isAdmin(options)
    .then(async (admin) => {
      if (!admin || stopped) return;
      const mount = await load();
      if (!stopped) unmount = mount(options);
    })
    .catch(noop);
  return () => {
    stopped = true;
    unmount();
  };
}
