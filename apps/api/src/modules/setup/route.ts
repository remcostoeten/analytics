import { Elysia } from "elysia";

import type { AccessDeps } from "../../access/types";
import { access } from "../../plugins/access";
import { failure } from "../../plugins/error-handler";
import { setupPage } from "./page";
import { setupView } from "./service";

function nonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

function policy(scriptNonce: string) {
  return [
    "default-src 'none'",
    `script-src 'nonce-${scriptNonce}'`,
    `style-src 'nonce-${scriptNonce}' https://fonts.googleapis.com`,
    "font-src https://fonts.gstatic.com",
    "img-src data:",
    "connect-src 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/**
 * @name setupModule
 * @description `GET /v2/setup`: the owner's page for sign-in, projects and keys until the
 * dashboard exists. Server-rendered HTML with one inline script, allowed by a per-request nonce
 * in the `Content-Security-Policy`, never cached, and hidden from the OpenAPI document. The forms
 * call the ordinary project routes with the session cookie.
 *
 * @example
 * app.use(setupModule(deps, docsBase));
 */
export function setupModule(deps: AccessDeps, docsBase: string) {
  return new Elysia({ name: "setup" }).use(access(deps, docsBase)).get(
    "/setup",
    async ({ request, caller, set }) => {
      const view = await setupView(deps, caller, new URL(request.url).origin);
      if (!view.ok) {
        const failed = failure(view.error, set.headers, docsBase);
        set.status = failed.status;
        return failed.body;
      }
      const token = nonce();
      return new Response(setupPage(view.value, token), {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "private, no-store",
          "content-security-policy": policy(token),
          "referrer-policy": "no-referrer",
          "x-content-type-options": "nosniff",
        },
      });
    },
    { access: "public", detail: { hide: true } },
  );
}
