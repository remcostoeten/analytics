import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { DebugtoolsOptions } from "../options";
import { widgetCss } from "./styles";
import { Widget } from "./widget";

const hostTag = "spoar-debugtools";

function adopt(root: ShadowRoot) {
  if ("adoptedStyleSheets" in root && "replaceSync" in CSSStyleSheet.prototype) {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(widgetCss);
    root.adoptedStyleSheets = [sheet];
    return;
  }
  const style = document.createElement("style");
  style.textContent = widgetCss;
  root.append(style);
}

/**
 * @name mountWidget
 * @description Renders the launcher and the console into a Shadow DOM root on a new
 * `<spoar-debugtools>` element at the end of `body`. The launcher stylesheet is adopted into that
 * root and React hoists the console's own stylesheet into it, so host CSS and widget CSS never
 * meet. Returns a function that unmounts React and removes the element.
 *
 * @example
 * const unmount = mountWidget({ endpoint: "https://api.example.com", project: "site" });
 */
export function mountWidget(options: DebugtoolsOptions): () => void {
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
  root.render(
    <StrictMode>
      <Widget data={options.data} />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    host.remove();
  };
}
