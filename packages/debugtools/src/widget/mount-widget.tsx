import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { Nullable } from "@spoar/shared/semantic";

import type { DebugtoolsOptions, WidgetGrant } from "../options";
import { Actions } from "../actions/actions";
import { sharedEventLog } from "../events/event-log";
import { clientAccess, clientSource } from "../source";
import { css } from "../styles/compiled";
import { StatusBar } from "./status-bar";
import { Widget } from "./widget";

const hostTag = "spoar-debugtools";

function adopt(root: ShadowRoot) {
  if ("adoptedStyleSheets" in root && "replaceSync" in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    root.adoptedStyleSheets = [sheet];
    return;
  }
  const style = document.createElement("style");
  style.textContent = css;
  root.append(style);
}

/**
 * @name mountWidget
 * @description Renders the launcher and the console into a Shadow DOM root on a new
 * `<spoar-debugtools>` element at the end of `body`. The compiled stylesheet is adopted into that
 * root, so host CSS and widget CSS never meet. The console reads the project through the widget
 * grant, or the session cookie with `auth: "session"`; a demo start without a grant shows the
 * fixture data. Returns a function that unmounts React and removes the element.
 *
 * @example
 * const unmount = mountWidget({ endpoint: "https://api.example.com", project: "site" }, grant);
 */
export function mountWidget(options: DebugtoolsOptions, grant: Nullable<WidgetGrant>): () => void {
  const host = document.createElement(hostTag);
  host.style.position = "fixed";
  host.style.inset = "auto";
  host.style.zIndex = "2147483001";
  const shadow = host.attachShadow({ mode: "open" });
  adopt(shadow);
  const container = document.createElement("div");
  shadow.append(container);
  document.body.append(host);
  const root = createRoot(container);
  const live = grant !== null || options.auth === "session";
  const client = clientAccess(options, grant);
  if (live && options.host) sharedEventLog(options.host);
  const context = live ? { project: options.project, client, host: options.host ?? null } : null;
  root.render(
    <StrictMode>
      <Widget
        label={live ? options.project : `${options.project} demo`}
        source={live ? clientSource(options, grant, undefined, client) : null}
        data={options.data}
        sections={options.sections}
        theme={options.theme}
        launcher={options.launcher}
        open={options.open}
        tabs={options.tabs}
        context={context}
        statusBar={
          live ? (
            <StatusBar
              endpoint={options.endpoint}
              project={options.project}
              grant={grant}
              fetch={options.fetch}
              actions={context ? <Actions context={context} /> : undefined}
            />
          ) : undefined
        }
      />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    host.remove();
  };
}
