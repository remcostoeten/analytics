import {
  armConsole,
  disarmConsole,
  readConsoleGrant,
  saveConsoleGrant,
} from "@spoar/shared/console";
import type { ConsoleGrant } from "@spoar/shared/console";
import { noop } from "@spoar/shared/noop";
import type { Nullable } from "@spoar/shared/semantic";

import { requestGrant } from "../loader/start";
import type { DebugtoolsOptions, WidgetGrant } from "../options";

type Mount = (options: DebugtoolsOptions, grant: Nullable<WidgetGrant>) => () => void;

export type GateOptions = Omit<DebugtoolsOptions, "project"> & {
  popup: Nullable<Window>;
};

type ConnectMessage = {
  type: string;
  project: string;
  token: string;
  expiresAt: string;
};

const connectType = "spoar:console";
const closedPollMs = 500;

let unmount: Nullable<() => void> = null;

async function loadWidget(): Promise<Mount> {
  const { mountWidget } = await import("../widget/mount-widget");
  return mountWidget;
}

function fromPopup(options: GateOptions, popup: Window): Promise<Nullable<ConsoleGrant>> {
  const api = new URL(options.endpoint).origin;
  return new Promise((resolve) => {
    function settle(grant: Nullable<ConsoleGrant>) {
      removeEventListener("message", receive);
      clearInterval(watch);
      resolve(grant);
    }
    function receive(event: MessageEvent<Partial<ConnectMessage> | null>) {
      if (event.source !== popup || event.origin !== api) return;
      const { type, project, token, expiresAt } = event.data ?? {};
      if (type !== connectType || !project || !token || !expiresAt) return;
      settle({ project, token, expiresAt });
    }
    const watch = setInterval(() => {
      if (popup.closed) settle(null);
    }, closedPollMs);
    addEventListener("message", receive);
  });
}

async function grantFor(options: GateOptions): Promise<Nullable<ConsoleGrant>> {
  if (options.popup) return fromPopup(options, options.popup);
  return readConsoleGrant(new Date()) ?? requestGrant(options);
}

/**
 * @name startConsole
 * @description Opens the debug console for a host that gates it, such as `@spoar/sdk`'s
 * `<Analytics debugConsole />`. With a `popup` it waits for the grant that
 * `GET /v2/widget/connect` posts back from the API's origin; without one it reuses the grant this
 * tab holds or asks `GET /v2/widget/session` with the session cookie. The grant names the project,
 * so the host does not have to. A grant is kept for the tab
 * and arms the browser, so later page loads open the console on their own; a refused start without
 * a popup disarms it. One console is mounted per page, however often it is started. Returns a
 * function that unmounts it.
 *
 * @example
 * const stop = startConsole({ endpoint: "https://api.example.com", popup: null });
 */
export function startConsole(
  options: GateOptions,
  load: () => Promise<Mount> = loadWidget,
): () => void {
  let stopped = false;
  void grantFor(options)
    .then(async (grant) => {
      if (stopped) return;
      if (!grant) {
        if (!options.popup) disarmConsole();
        return;
      }
      saveConsoleGrant(grant);
      armConsole(grant.project);
      if (unmount) return;
      const mount = await load();
      const open = options.popup ? true : options.open;
      if (!stopped && !unmount)
        unmount = mount({ ...options, project: grant.project, open }, grant);
    })
    .catch(noop);
  return () => {
    stopped = true;
    unmount?.();
    unmount = null;
  };
}

export type { ConsoleGrant } from "@spoar/shared/console";
