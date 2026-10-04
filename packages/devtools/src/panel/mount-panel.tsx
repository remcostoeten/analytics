import { noop } from "@spoar/shared/noop";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import type { Bootstrap } from "../client/types";
import type { DevtoolsOptions } from "../options";
import { css, font } from "../styles/compiled";
import { Panel } from "./panel";
import { createRuntime } from "./runtime";

const hostTag = "ra-devtools";
const fontFamily = "RA JetBrains Mono";

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

function loadFont() {
  if (!("fonts" in document)) return;
  if ([...document.fonts].some((face) => face.family === fontFamily)) return;
  const bytes = Uint8Array.from(atob(font), (char) => char.charCodeAt(0));
  // Chromium ignores @font-face inside a shadow root, so the face goes to document.fonts under a widget-only family name.
  const face = new FontFace(fontFamily, bytes, { weight: "100 800", display: "swap" });
  document.fonts.add(face);
  void face.load().catch(noop);
}

/**
 * @name mountPanel
 * @description Renders the panel into a Shadow DOM root on a new `<ra-devtools>` element at the
 * end of `body`, with the compiled stylesheet adopted into that root, and starts its data
 * runtime. Returns a function that stops the runtime and removes the element.
 *
 * @example
 * const unmount = mountPanel(bootstrap, options);
 */
export function mountPanel(bootstrap: Bootstrap, options: DevtoolsOptions): () => void {
  const host = document.createElement(hostTag);
  host.style.position = "fixed";
  host.style.inset = "auto";
  host.style.zIndex = "2147483000";
  const shadow = host.attachShadow({ mode: "open" });
  adopt(shadow);
  loadFont();
  const container = document.createElement("div");
  shadow.append(container);
  document.body.append(host);
  const runtime = createRuntime(bootstrap, options);
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <Panel runtime={runtime} />
    </StrictMode>,
  );
  return () => {
    root.unmount();
    runtime.stop();
    host.remove();
  };
}
