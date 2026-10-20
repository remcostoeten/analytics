import { useEffect } from "react";

import { isConsoleArmed, readConsoleGrant } from "@spoar/shared/console";
import { noop } from "@spoar/shared/noop";
import type { Nullable } from "@spoar/shared/semantic";

import { useAnalytics } from "../react/use-analytics";

export type DebugConsole = boolean | { api: string };

type Props = {
  option: DebugConsole;
};

const hostedApi = "https://api.analytics.remcostoeten.nl";
const popupFeatures = "popup,width=480,height=640";

function apiFor(custom: Nullable<string>, endpoint: string) {
  if (custom) return custom;
  return /^https?:\/\//.test(endpoint) ? new URL(endpoint).origin : hostedApi;
}

function isShortcut(event: KeyboardEvent) {
  return (event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "k";
}

function gate(api: string): () => void {
  let stopped = false;
  let stop = noop;

  function start(popup: Nullable<Window>) {
    void import("@spoar/debugtools/gate")
      .then(({ startConsole }) => {
        if (!stopped) stop = startConsole({ endpoint: api, popup });
      })
      .catch(noop);
  }

  function onKey(event: KeyboardEvent) {
    if (!isShortcut(event) || readConsoleGrant(new Date())) return;
    const url = `${api}/v2/widget/connect?origin=${encodeURIComponent(location.origin)}`;
    const popup = window.open(url, "spoar-console", popupFeatures);
    if (popup) start(popup);
  }

  if (readConsoleGrant(new Date()) || isConsoleArmed()) start(null);
  addEventListener("keydown", onKey);
  return () => {
    stopped = true;
    removeEventListener("keydown", onKey);
    stop();
  };
}

/**
 * @name DebugConsoleGate
 * @description Gates the debug console from `@spoar/debugtools` behind the browser instead of
 * the API, loaded only where `<Analytics debugConsole />` is set. A visitor gets a keyboard
 * listener and two storage reads: no request and no console code. Ctrl+Shift+K (Cmd+Shift+K on a
 * Mac) opens `GET /v2/widget/connect` on the API in a popup, which hands a signed-in project admin
 * a widget grant; after that, page loads in that browser open the console on their own. The API is
 * `api` when given, else the origin of an absolute `endpoint`, else the hosted API, since the
 * `/_ra` proxy never sees the admin's cookie.
 *
 * @example
 * <DebugConsoleGate option />
 */
export default function DebugConsoleGate({ option }: Props) {
  const client = useAnalytics();
  const on = option !== false;
  const custom = option === true || option === false ? null : option.api;

  useEffect(() => {
    if (!on) return;
    return gate(apiFor(custom, client.status().endpoint));
  }, [client, on, custom]);

  return null;
}
