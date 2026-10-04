import { noop } from "@spoar/shared/noop";
import type { Nullable } from "@spoar/shared/semantic";

import type { WidgetSession } from "@spoar/contract";

import { toBootstrap } from "../client/bootstrap";
import type { Bootstrap } from "../client/types";
import type { DevtoolsOptions } from "../options";

type Mount = (bootstrap: Bootstrap, options: DevtoolsOptions) => () => void;

/**
 * @name readBootstrap
 * @description Asks `GET /v2/widget/session` whether the browser holds an admin session for the
 * project, with the session cookie. Resolves to the bootstrap on a 200 and to `null` for anything
 * else, a network failure included, so a signed-out visitor stops here.
 *
 * @example
 * const bootstrap = await readBootstrap({ endpoint: "https://api.example.com", project: "site" });
 */
export async function readBootstrap(options: DevtoolsOptions): Promise<Nullable<Bootstrap>> {
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
    const body: WidgetSession = await response.json();
    return toBootstrap(body);
  } catch {
    return null;
  }
}

/**
 * @name startDevtools
 * @description Runs the bootstrap call and, only when it succeeds, imports the panel chunk
 * through `load` and mounts it. Returns a function that cancels a pending start or unmounts the
 * panel.
 *
 * @example
 * const stop = startDevtools(options, () => import("../panel/mount-panel").then((m) => m.mountPanel));
 */
export function startDevtools(options: DevtoolsOptions, load: () => Promise<Mount>): () => void {
  let stopped = false;
  let unmount = noop;
  void readBootstrap(options)
    .then(async (bootstrap) => {
      if (!bootstrap || stopped) return;
      const mount = await load();
      if (!stopped) unmount = mount(bootstrap, options);
    })
    .catch(noop);
  return () => {
    stopped = true;
    unmount();
  };
}
