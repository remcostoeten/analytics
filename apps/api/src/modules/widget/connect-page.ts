import type { WidgetSession } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";

export type ConnectView =
  | { kind: "granted"; origin: string; session: WidgetSession }
  | { kind: "refused"; message: string; signIn: Nullable<string> };

type ConnectMessage = {
  type: string;
  project: string;
  token: string;
  expiresAt: string;
};

const connectType = "spoar:console";

const style = `body{margin:0;min-height:100vh;display:grid;place-items:center;font:14px/1.5 system-ui,sans-serif;color:#e5e5e5;background:#0a0a0a}main{max-width:320px;padding:24px;text-align:center}a{color:#f97316}`;

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function scriptJson(value: ConnectMessage | string) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function body(view: ConnectView, nonce: string) {
  if (view.kind === "granted") {
    const message: ConnectMessage = {
      type: connectType,
      project: view.session.project,
      token: view.session.token,
      expiresAt: view.session.expiresAt,
    };
    return `<main><p>Opening the debug console on ${escapeHtml(view.origin)}. You can close this window.</p></main><script nonce="${nonce}">if(window.opener)window.opener.postMessage(${scriptJson(message)},${scriptJson(view.origin)});window.close();</script>`;
  }
  const link = view.signIn ? ` <a href="${escapeHtml(view.signIn)}">Sign in</a>` : "";
  return `<main><p>${escapeHtml(view.message)}.${link}</p></main>`;
}

/**
 * @name connectPage
 * @description The popup page `GET /v2/widget/connect` answers. Granted, it posts the widget token
 * to the window that opened it, only when that window is on the site's origin, and closes itself.
 * Refused, it says why and, for a signed-out caller, links to the dashboard's sign-in. Scripts
 * and styles run only with the response's nonce.
 *
 * @example
 * const html = connectPage({ kind: "refused", message: "No project lists this origin", signIn: null }, nonce);
 */
export function connectPage(view: ConnectView, nonce: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Debug console</title><style nonce="${nonce}">${style}</style></head><body>${body(view, nonce)}</body></html>`;
}

/**
 * @name connectHeaders
 * @description Headers for the popup page: never cached or framed, no referrer, and a policy that
 * allows only the inline script and style carrying the nonce.
 *
 * @example
 * new Response(html, { status: 200, headers: connectHeaders(nonce) });
 */
export function connectHeaders(nonce: string): Headers {
  return new Headers({
    "content-type": "text/html; charset=utf-8",
    "cache-control": "private, no-store",
    "content-security-policy": `default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
  });
}
