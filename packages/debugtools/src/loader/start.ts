import type { ApiError, WidgetSession } from "@spoar/contract";
import type { ConsoleGrant } from "@spoar/shared/console";
import { noop } from "@spoar/shared/noop";
import type { Nullable } from "@spoar/shared/semantic";

import type { DebugtoolsOptions, WidgetGrant } from "../options";

type Mount = (options: DebugtoolsOptions, grant: Nullable<WidgetGrant>) => () => void;

export type GrantRequest = Pick<DebugtoolsOptions, "endpoint" | "fetch"> & { project?: string };

export type GrantAnswer = { grant: Nullable<ConsoleGrant>; refusal: Nullable<string> };

type Refused = (response: Response) => Promise<void>;

async function refusalOf(response: Response): Promise<Nullable<string>> {
  if (response.status !== 401 && response.status !== 403 && response.status !== 404) return null;
  try {
    const body = (await response.json()) as Partial<ApiError> | null;
    return body?.error?.message ?? null;
  } catch {
    return null;
  }
}

async function ask(options: GrantRequest, refused?: Refused): Promise<Nullable<ConsoleGrant>> {
  const send = options.fetch ?? fetch;
  let base = options.endpoint;
  while (base.endsWith("/")) base = base.slice(0, -1);
  const query = options.project ? `?project=${encodeURIComponent(options.project)}` : "";
  const url = `${base}/v2/widget/session${query}`;
  try {
    const response = await send(url, {
      credentials: "include",
      headers: { accept: "application/json" },
    });
    if (response.status !== 200) {
      await refused?.(response);
      return null;
    }
    const session = (await response.json()) as WidgetSession;
    return { project: session.project, token: session.token, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}

/**
 * @name requestGrant
 * @description Asks `GET /v2/widget/session` for a widget token, with the session cookie. Resolves
 * to the project, the token and its expiry only on a 200; a network failure and every other status
 * resolve to null, so a signed-out visitor stops here.
 *
 * @example
 * const grant = await requestGrant({ endpoint: "https://api.example.com", project: "site" });
 * if (grant) open(grant.token);
 */
export function requestGrant(options: GrantRequest): Promise<Nullable<ConsoleGrant>> {
  return ask(options);
}

/**
 * @name requestGrantAnswer
 * @description `requestGrant` that also keeps why the API said no. A 401, 403 or 404 carries the
 * API's message as `refusal`, such as "The debug console is off for site"; a network failure and
 * every other status give no message.
 *
 * @example
 * const { grant, refusal } = await requestGrantAnswer({ endpoint: "https://api.example.com" });
 */
export async function requestGrantAnswer(options: GrantRequest): Promise<GrantAnswer> {
  let refusal: Nullable<string> = null;
  const grant = await ask(options, async (response) => {
    refusal = await refusalOf(response);
  });
  return { grant, refusal };
}

/**
 * @name startDebugtools
 * @description Runs the admin check and, only when it passes, imports the console chunk through
 * `load` and mounts it with the widget grant. With `auth: "session"` there is no widget check: the
 * host is the dashboard, which already holds the session cookie. With `demo` a failed check still
 * loads the console, on fixture data. Returns a function that cancels a pending start or unmounts
 * the console.
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
      if (stopped || (options.auth !== "session" && !grant && !options.demo)) return;
      const mount = await load();
      if (!stopped) unmount = mount(options, grant);
    })
    .catch(noop);
  return () => {
    stopped = true;
    unmount();
  };
}
