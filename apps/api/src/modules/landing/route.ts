import type { Nullable } from "@remcostoeten/analytics-shared/semantic";
import { Elysia } from "elysia";

export type LandingOptions = {
  version: string;
  commit: Nullable<string>;
};

type Route = {
  method: "GET" | "POST";
  path: string;
  description: string;
};

const repository = "https://github.com/remcostoeten/analytics";
const routes: Route[] = [
  { method: "GET", path: "/v2/health", description: "Liveness, version and cold start details" },
  { method: "POST", path: "/v2/events", description: "Ingest events from browsers and servers" },
  { method: "GET", path: "/v2/openapi", description: "Interactive API reference" },
  { method: "GET", path: "/v2/openapi/json", description: "OpenAPI 3 document" },
];
// A full or abbreviated git commit hash; anything else is left off the page.
const commitHash = /^[0-9a-f]{7,40}$/;

const styles = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; background: #0a0a0a; color: #e5e5e5; padding: 32px; max-width: 720px; margin: 0 auto; }
h1 { font-size: 20px; font-weight: 600; }
.meta { color: #777; font-size: 12px; margin: 8px 0 24px; display: flex; gap: 16px; flex-wrap: wrap; }
.meta strong { color: #9ece6a; font-weight: 500; }
ul { list-style: none; border-top: 1px solid #1a1a1a; }
li { display: flex; align-items: center; gap: 12px; padding: 14px 0; border-bottom: 1px solid #1a1a1a; flex-wrap: wrap; }
.method { font-family: ui-monospace, monospace; font-size: 11px; padding: 3px 6px; border: 1px solid #2a2a2a; width: 54px; text-align: center; }
.get { color: #9ece6a; }
.post { color: #7aa2f7; }
.path { font-family: ui-monospace, monospace; color: #fff; }
.description { color: #777; font-size: 13px; margin-left: auto; }
footer { margin-top: 24px; color: #777; font-size: 13px; display: flex; gap: 16px; }
a { color: #7aa2f7; text-decoration: none; }
a:hover { text-decoration: underline; }
`;

function routeRow(route: Route) {
  const path =
    route.method === "GET"
      ? `<a class="path" href="${route.path}">${route.path}</a>`
      : `<span class="path">${route.path}</span>`;
  return `<li><span class="method ${route.method.toLowerCase()}">${route.method}</span>${path}<span class="description">${route.description}</span></li>`;
}

function commitLink(commit: Nullable<string>) {
  if (!commit || !commitHash.test(commit)) return "";
  return `<span>Commit <a href="${repository}/commit/${commit}">${commit.slice(0, 7)}</a></span>`;
}

function page(options: LandingOptions) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>Analytics API</title>
<style>${styles}</style>
</head>
<body>
<h1>Analytics API</h1>
<div class="meta"><span>Status <strong>online</strong></span><span>Version ${options.version}</span>${commitLink(options.commit)}</div>
<ul>${routes.map((route) => routeRow(route)).join("")}</ul>
<footer><a href="https://docs.analytics.remcostoeten.nl">Docs</a><a href="${repository}">Source</a></footer>
</body>
</html>`;
}

/**
 * @name landingModule
 * @description `GET /`: a small HTML page with the API version, the deployed commit and links to
 * the health route, the ingest route and the API reference. It is left out of the OpenAPI document.
 *
 * @example
 * new Elysia().use(landingModule({ version: "2.0.0-next", commit: null }));
 */
export function landingModule(options: LandingOptions) {
  const html = page(options);
  return new Elysia({ name: "landing" }).get(
    "/",
    () => new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }),
    { detail: { hide: true } },
  );
}
