import type { Landing, RouteEntry, RouteGroup } from "./service";

const entities: { [character: string]: string } = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escape(value: string) {
  return value.replaceAll(/[&<>"']/g, (character) => entities[character] ?? character);
}

function inlineCode(value: string) {
  // Turns `text` spans from route summaries into code elements.
  return escape(value).replaceAll(/`([^`]+)`/g, "<code>$1</code>");
}

function slug(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
}

const styles = `
:root {
  color-scheme: dark;
  --bg: #0a0a0a;
  --panel: #111111;
  --raised: #171717;
  --line: #262626;
  --text: #e5e5e5;
  --muted: #a3a3a3;
  --faint: #737373;
  --mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 15px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
a { color: var(--text); text-decoration: underline; text-decoration-color: var(--faint); text-underline-offset: 3px; }
a:hover { text-decoration-color: var(--text); }
code, pre, .mono { font-family: var(--mono); font-size: 13px; }
code { background: var(--raised); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; }
main { max-width: 960px; margin: 0 auto; padding: 56px 16px 72px; }
header { display: flex; flex-direction: column; gap: 12px; padding-bottom: 32px; border-bottom: 1px solid var(--line); }
h1 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -0.02em; }
h2 { margin: 0 0 16px; font-size: 13px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; }
h3 { margin: 0; font-size: 15px; font-weight: 600; }
p { margin: 0; }
.lead { color: var(--muted); max-width: 640px; }
.meta { display: flex; flex-wrap: wrap; gap: 8px; }
.pill { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line); border-radius: 999px; padding: 2px 10px; color: var(--muted); font-family: var(--mono); font-size: 12px; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: var(--text); }
section { padding-top: 40px; }
.links { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 8px; }
.link { display: flex; flex-direction: column; gap: 2px; padding: 14px 16px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; text-decoration: none; }
.link:hover { border-color: var(--faint); }
.link span { color: var(--faint); font-family: var(--mono); font-size: 12px; overflow-wrap: anywhere; }
.facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 8px; }
.fact { padding: 16px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; display: flex; flex-direction: column; gap: 6px; }
.fact p { color: var(--muted); font-size: 14px; }
pre { margin: 0; padding: 14px 16px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow-x: auto; color: var(--muted); }
pre + pre { margin-top: 8px; }
.toc { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px; }
.toc a { text-decoration: none; }
.toc a:hover .pill { color: var(--text); border-color: var(--faint); }
.group { margin-bottom: 16px; background: var(--panel); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.group-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 14px 16px; border-bottom: 1px solid var(--line); }
.group-head p { color: var(--faint); font-size: 13px; }
.count { color: var(--faint); font-family: var(--mono); font-size: 12px; white-space: nowrap; }
ul { list-style: none; margin: 0; padding: 0; }
li { display: grid; grid-template-columns: 64px minmax(0, 1.2fr) minmax(0, 1fr); align-items: baseline; gap: 4px 16px; padding: 10px 16px; border-top: 1px solid var(--line); }
li:first-child { border-top: 0; }
.method { font-family: var(--mono); font-size: 11px; font-weight: 600; color: var(--muted); }
.path { font-family: var(--mono); font-size: 13px; overflow-wrap: anywhere; }
.summary { color: var(--faint); font-size: 13px; }
.summary code { font-size: 12px; }
footer { margin-top: 56px; padding-top: 24px; border-top: 1px solid var(--line); color: var(--faint); font-size: 13px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
@media (max-width: 560px) {
  main { padding-top: 32px; }
  li { grid-template-columns: 1fr; }
}
`;

const facts = [
  {
    title: "No visitor cookies",
    body: "Tracked visitors get no cookies. The admin session cookie for the dashboard is the only cookie the API sets.",
  },
  {
    title: "No raw IP addresses",
    body: "Raw IP addresses are never stored. The API keeps a salted hash and reads the address in memory for the geo lookup.",
  },
  {
    title: "Ingest",
    body: "Browsers send `X-Project-Key` from an allowed origin. Servers send `Authorization: Bearer sk_...`. At most 60 KB and 50 events per request.",
  },
  {
    title: "Reads",
    body: "Public projects can be read without a key. Private projects need a signed-in member or an API token, and answer 404 to everyone else.",
  },
  {
    title: "Errors",
    body: "Every error uses `{ error: { code, message, requestId, docs } }`, and every response carries `x-request-id`.",
  },
  {
    title: "Rate limits",
    body: "Limited requests answer 429 with `Retry-After`. Ingest, anonymous reads and the SQL console each have their own budget.",
  },
];

function linkCard(title: string, href: string, label: string) {
  return `<a class="link" href="${escape(href)}"><strong>${escape(title)}</strong><span>${escape(label)}</span></a>`;
}

function routeItem(route: RouteEntry) {
  const method = route.method === "ALL" ? "ANY" : route.method;
  const summary = route.summary ? `<span class="summary">${inlineCode(route.summary)}</span>` : "";
  return `<li><span class="method">${escape(method)}</span><span class="path">${escape(route.path)}</span>${summary}</li>`;
}

function groupBlock(group: RouteGroup) {
  const count = `${group.routes.length} ${group.routes.length === 1 ? "route" : "routes"}`;
  return `<div class="group" id="${slug(group.name)}">
<div class="group-head"><div><h3>${escape(group.name)}</h3><p>${escape(group.description)}</p></div><span class="count">${count}</span></div>
<ul>${group.routes.map(routeItem).join("")}</ul>
</div>`;
}

/**
 * @name landingPage
 * @description Renders the API landing page as one static HTML document: status, links, the
 * public facts about privacy, access and errors, a quick start, and every documented route.
 *
 * @example
 * const html = landingPage(landing({ version, time, baseUrl, groups }));
 */
export function landingPage(view: Landing): string {
  const total = view.groups.reduce((sum, group) => sum + group.routes.length, 0);
  const host = view.baseUrl.replace(/^https?:\/\//, "");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="description" content="The v2 API for self-hosted, privacy-first web analytics: ingest, reads, sign-in and the SQL console.">
<title>${escape(view.name)}</title>
<style>${styles}</style>
</head>
<body>
<main>
<header>
<div class="meta"><span class="pill"><span class="dot"></span>${escape(view.status === "ok" ? "Operational" : view.status)}</span><span class="pill">v${escape(view.version)}</span><span class="pill">${escape(host)}</span></div>
<h1>${escape(view.name)}</h1>
<p class="lead">The API behind a self-hosted, privacy-first web analytics service. It takes events from the browser and server SDK, serves aggregate and visitor-level reads, error tracking, speed insights and a read-only SQL console. Every route lives under <code>/v2</code>.</p>
</header>

<section>
<h2>Links</h2>
<div class="links">
${linkCard("Interactive docs", view.links.docs, "/v2/openapi")}
${linkCard("OpenAPI document", view.links.openapi, "/v2/openapi/json")}
${linkCard("Health", view.links.health, "/v2/health")}
${linkCard("Guides and SDK", view.links.guide, view.links.guide.replace(/^https:\/\//, ""))}
${linkCard("Source", view.links.source, "github.com/remcostoeten/analytics")}
</div>
</section>

<section>
<h2>How it works</h2>
<div class="facts">
${facts.map((fact) => `<div class="fact"><h3>${escape(fact.title)}</h3><p>${inlineCode(fact.body)}</p></div>`).join("\n")}
</div>
</section>

<section>
<h2>Quick start</h2>
<pre>curl ${escape(view.links.health)}</pre>
<pre>curl "${escape(view.baseUrl)}/v2/projects/remcostoeten.nl/stats?period=7d"</pre>
</section>

<section>
<h2>Routes <span class="count">${total}</span></h2>
<nav class="toc">${view.groups.map((group) => `<a href="#${slug(group.name)}"><span class="pill">${escape(group.name)}</span></a>`).join("")}</nav>
${view.groups.map(groupBlock).join("\n")}
</section>

<footer>
<span>Analytics API v${escape(view.version)}</span>
<span>Rendered <time datetime="${escape(view.time)}">${escape(view.time)}</time></span>
</footer>
</main>
</body>
</html>
`;
}
