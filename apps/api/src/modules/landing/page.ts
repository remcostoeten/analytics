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

function pathMarkup(path: string) {
  const rest = path.startsWith("/v2") ? path.slice(3) : path;
  const prefix = rest === path ? "" : `<span class="prefix">/v2</span>`;
  // Wraps `:param` and `*` segments so they read as placeholders.
  const body = escape(rest).replaceAll(/(:[\w]+|\*)/g, `<span class="param">$1</span>`);
  return `${prefix}${body}`;
}

const icons = {
  cookie: `<path d="M12 3a9 9 0 1 0 9 9 4 4 0 0 1-4-4 4 4 0 0 1-5-5Z"/><path d="M8.5 13.5h.01M12 17h.01M15.5 14.5h.01M9 9h.01"/>`,
  shield: `<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z"/><path d="m9 12 2 2 4-4"/>`,
  send: `<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4 18-7Z"/>`,
  eye: `<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>`,
  alert: `<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4M12 17h.01"/>`,
  gauge: `<path d="M12 14 16 9"/><path d="M3.5 18a9 9 0 1 1 17 0"/>`,
  copy: `<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>`,
  arrow: `<path d="M7 17 17 7M8 7h9v9"/>`,
  search: `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>`,
};

function icon(name: keyof typeof icons, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
}

const mark = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="13" width="4" height="9" rx="1" fill="currentColor" opacity=".45"/><rect x="10" y="7" width="4" height="15" rx="1" fill="currentColor" opacity=".7"/><rect x="18" y="2" width="4" height="20" rx="1" fill="currentColor"/></svg>`;

const facts: { icon: keyof typeof icons; title: string; body: string }[] = [
  {
    icon: "cookie",
    title: "No visitor cookies",
    body: "Tracked visitors get no cookies. The admin session cookie for the dashboard is the only cookie the API sets.",
  },
  {
    icon: "shield",
    title: "No raw IP addresses",
    body: "Raw IP addresses are never stored. The API keeps a salted hash and reads the address in memory for the geo lookup.",
  },
  {
    icon: "send",
    title: "Ingest",
    body: "Browsers send `X-Project-Key` from an allowed origin. Servers send `Authorization: Bearer sk_...`.",
  },
  {
    icon: "eye",
    title: "Reads",
    body: "Public projects can be read without a key. Private projects need a signed-in member or an API token, and answer 404 to everyone else.",
  },
  {
    icon: "alert",
    title: "Errors",
    body: "Every error uses `{ error: { code, message, requestId, docs } }`, and every response carries `x-request-id`.",
  },
  {
    icon: "gauge",
    title: "Rate limits",
    body: "Limited requests answer 429 with `Retry-After`. Ingest, anonymous reads and the SQL console each have their own budget.",
  },
];

const styles = `
:root {
  color-scheme: dark;
  --bg: #08080a;
  --panel: #0f0f11;
  --raised: #16161a;
  --hover: #1c1c21;
  --line: #222227;
  --line-strong: #2e2e35;
  --text: #ededef;
  --muted: #a1a1aa;
  --faint: #6b6b74;
  --ghost: #3f3f46;
  --mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace;
  --sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --radius: 10px;
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; scroll-padding-top: 80px; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 15px/1.6 var(--sans);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image:
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,.08), transparent 70%),
    linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 100% 100%, 48px 48px, 48px 48px;
  -webkit-mask-image: linear-gradient(to bottom, #000 0, transparent 720px);
  mask-image: linear-gradient(to bottom, #000 0, transparent 720px);
}
::selection { background: var(--text); color: var(--bg); }
a { color: inherit; text-decoration: none; }
code, pre, kbd, .mono { font-family: var(--mono); }
code { font-size: .86em; background: var(--raised); border: 1px solid var(--line); border-radius: 5px; padding: 1px 5px; color: var(--text); }
kbd { font-size: 11px; color: var(--faint); border: 1px solid var(--line-strong); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; }
.wrap { max-width: 1120px; margin: 0 auto; padding: 0 16px; }

.bar { position: sticky; top: 0; z-index: 10; backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); background: rgba(8,8,10,.72); border-bottom: 1px solid var(--line); }
.bar .wrap { display: flex; align-items: center; justify-content: space-between; height: 56px; gap: 16px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 600; letter-spacing: -.01em; }
.brand .slash { color: var(--ghost); font-weight: 400; }
.brand .repo { color: var(--muted); font-weight: 500; }
.nav { display: flex; gap: 4px; }
.nav a { color: var(--muted); font-size: 14px; padding: 6px 10px; border-radius: 6px; transition: color .15s, background .15s; }
.nav a:hover { color: var(--text); background: var(--raised); }

.hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 48px; align-items: center; padding: 88px 0 72px; }
.eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 12px; color: var(--muted); border: 1px solid var(--line-strong); background: rgba(255,255,255,.02); border-radius: 999px; padding: 4px 12px 4px 10px; }
.pulse { position: relative; width: 8px; height: 8px; border-radius: 50%; background: var(--text); }
.pulse::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--text); animation: pulse 2.4s cubic-bezier(.2,.6,.4,1) infinite; }
@keyframes pulse { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(3); opacity: 0; } }
h1 { margin: 20px 0 16px; font-size: clamp(40px, 6vw, 64px); line-height: 1; font-weight: 650; letter-spacing: -.045em; background: linear-gradient(180deg, #fff 30%, #8a8a93); -webkit-background-clip: text; background-clip: text; color: transparent; }
.lead { margin: 0; color: var(--muted); font-size: 17px; max-width: 520px; }
.lead code { font-size: 14px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 32px; }
.button { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 16px; border-radius: 8px; font-size: 14px; font-weight: 500; border: 1px solid var(--line-strong); color: var(--text); background: var(--raised); transition: background .15s, border-color .15s, transform .15s; }
.button:hover { background: var(--hover); border-color: var(--ghost); }
.button:active { transform: translateY(1px); }
.button.primary { background: var(--text); color: var(--bg); border-color: var(--text); }
.button.primary:hover { background: #fff; }

.terminal { position: relative; border: 1px solid var(--line-strong); border-radius: 12px; background: linear-gradient(180deg, #121215, #0b0b0d); box-shadow: 0 0 0 1px rgba(0,0,0,.6), 0 30px 80px -20px rgba(0,0,0,.8), inset 0 1px 0 rgba(255,255,255,.05); overflow: hidden; }
.terminal::before { content: ""; position: absolute; inset: -1px; border-radius: 12px; padding: 1px; background: linear-gradient(160deg, rgba(255,255,255,.18), transparent 40%); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
.terminal-head { display: flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border-bottom: 1px solid var(--line); }
.lights { display: flex; gap: 6px; }
.lights span { width: 10px; height: 10px; border-radius: 50%; background: var(--ghost); }
.terminal-head .title { flex: 1; text-align: center; font-family: var(--mono); font-size: 12px; color: var(--faint); margin-right: 42px; }
.terminal pre { margin: 0; padding: 18px 20px 22px; font-size: 13px; line-height: 1.75; overflow-x: auto; color: var(--muted); }
.prompt { color: var(--ghost); user-select: none; }
.cmd { color: var(--text); }
.dim { color: var(--faint); }
.k { color: var(--muted); }
.s { color: var(--text); }
.n { color: #d4d4d8; font-weight: 600; }
.caret { display: inline-block; width: 8px; height: 15px; vertical-align: -2px; background: var(--muted); animation: blink 1.1s steps(1) infinite; }
@keyframes blink { 50% { opacity: 0; } }

.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); overflow: hidden; }
.stat { padding: 22px 24px; border-left: 1px solid var(--line); }
.stat:first-child { border-left: 0; }
.stat strong { display: block; font-size: 30px; font-weight: 600; letter-spacing: -.03em; line-height: 1.1; font-variant-numeric: tabular-nums; }
.stat span { color: var(--faint); font-size: 13px; }

section { padding-top: 88px; }
.section-head { display: flex; align-items: end; justify-content: space-between; gap: 16px; margin-bottom: 24px; }
.kicker { font-family: var(--mono); font-size: 12px; color: var(--faint); text-transform: uppercase; letter-spacing: .12em; margin: 0 0 8px; }
h2 { margin: 0; font-size: 28px; font-weight: 600; letter-spacing: -.03em; line-height: 1.2; }
h3 { margin: 0; font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
p { margin: 0; }

.facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
.fact { background: var(--panel); padding: 24px; display: flex; flex-direction: column; gap: 10px; transition: background .2s; }
.fact:hover { background: var(--raised); }
.fact .glyph { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 8px; border: 1px solid var(--line-strong); background: var(--bg); color: var(--muted); margin-bottom: 6px; }
.fact p { color: var(--muted); font-size: 14px; }

.steps { display: grid; gap: 12px; }
.step { display: grid; grid-template-columns: 32px minmax(0, 1fr); gap: 16px; align-items: start; }
.step-n { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--line-strong); font-family: var(--mono); font-size: 12px; color: var(--muted); background: var(--panel); }
.step-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.step-body p { color: var(--muted); font-size: 14px; padding-top: 5px; }
.snippet { display: flex; align-items: center; gap: 12px; border: 1px solid var(--line); background: var(--panel); border-radius: 8px; padding: 0 6px 0 16px; min-height: 46px; }
.snippet pre { flex: 1; margin: 0; padding: 12px 0; font-size: 13px; overflow-x: auto; color: var(--text); }
.copy { flex: none; display: grid; place-items: center; width: 34px; height: 34px; border-radius: 6px; border: 0; background: transparent; color: var(--faint); cursor: pointer; transition: color .15s, background .15s; }
.copy:hover { color: var(--text); background: var(--raised); }
.copy[data-done] { color: var(--text); }

.routes { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 32px; align-items: start; }
.side { position: sticky; top: 80px; display: flex; flex-direction: column; gap: 2px; }
.side a { display: flex; justify-content: space-between; gap: 8px; padding: 6px 10px; border-radius: 6px; font-size: 14px; color: var(--muted); transition: color .15s, background .15s; }
.side a:hover { color: var(--text); background: var(--raised); }
.side a span { font-family: var(--mono); font-size: 12px; color: var(--ghost); }
.search { display: flex; align-items: center; gap: 10px; height: 42px; padding: 0 12px; margin-bottom: 20px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--panel); color: var(--faint); transition: border-color .15s; }
.search:focus-within { border-color: var(--faint); }
.search input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: var(--text); font: 14px var(--sans); }
.search input::placeholder { color: var(--faint); }
.search input::-webkit-search-cancel-button { -webkit-appearance: none; }
.group { margin-bottom: 20px; border: 1px solid var(--line); border-radius: var(--radius); background: var(--panel); overflow: hidden; }
.group-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--line); background: linear-gradient(180deg, rgba(255,255,255,.02), transparent); }
.group-head p { color: var(--faint); font-size: 13px; margin-top: 2px; }
.count { color: var(--faint); font-family: var(--mono); font-size: 12px; white-space: nowrap; }
ul { list-style: none; margin: 0; padding: 0; }
li { display: grid; grid-template-columns: 68px minmax(0, 1.25fr) minmax(0, 1fr); align-items: baseline; gap: 4px 16px; padding: 11px 18px; border-top: 1px solid var(--line); transition: background .12s; }
li:first-child { border-top: 0; }
li:hover { background: var(--raised); }
.method { justify-self: start; font-family: var(--mono); font-size: 10.5px; font-weight: 600; letter-spacing: .04em; padding: 2px 7px; border-radius: 4px; border: 1px solid var(--line-strong); color: var(--muted); }
.method.get { color: var(--text); }
.method.post { background: var(--text); color: var(--bg); border-color: var(--text); }
.method.put, .method.patch { background: var(--ghost); color: var(--text); border-color: var(--ghost); }
.method.delete { color: var(--muted); border-style: dashed; }
.path { font-family: var(--mono); font-size: 13px; overflow-wrap: anywhere; color: var(--text); }
.prefix { color: var(--ghost); }
.param { color: var(--muted); font-style: italic; }
.summary { color: var(--faint); font-size: 13px; }
.summary code { font-size: 12px; }
.empty { display: none; padding: 40px; text-align: center; color: var(--faint); border: 1px dashed var(--line-strong); border-radius: var(--radius); }

footer { margin-top: 96px; border-top: 1px solid var(--line); }
footer .wrap { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; padding: 28px 16px 40px; color: var(--faint); font-size: 13px; }
footer a:hover { color: var(--text); }

@media (max-width: 900px) {
  .hero { grid-template-columns: minmax(0, 1fr); gap: 40px; padding: 56px 0 48px; }
  .facts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .routes { grid-template-columns: minmax(0, 1fr); }
  .side { display: none; }
}
@media (max-width: 640px) {
  .nav a.wide { display: none; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stat:nth-child(3) { border-left: 0; }
  .stat:nth-child(n+3) { border-top: 1px solid var(--line); }
  .facts { grid-template-columns: minmax(0, 1fr); }
  section { padding-top: 64px; }
  li { grid-template-columns: minmax(0, 1fr); gap: 6px; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .pulse::after, .caret { animation: none; }
}
`;

const script = `
(() => {
  const input = document.getElementById("filter");
  const groups = [...document.querySelectorAll(".group")];
  const empty = document.querySelector(".empty");
  input.addEventListener("input", () => {
    const query = input.value.trim().toLowerCase();
    let shown = 0;
    for (const group of groups) {
      let visible = 0;
      for (const row of group.querySelectorAll("li")) {
        const match = !query || row.textContent.toLowerCase().includes(query);
        row.hidden = !match;
        if (match) visible += 1;
      }
      group.hidden = visible === 0;
      shown += visible;
    }
    empty.style.display = shown === 0 ? "block" : "none";
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || document.activeElement === input) return;
    event.preventDefault();
    input.focus();
  });
  for (const button of document.querySelectorAll(".copy")) {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.dataset.done = "";
      setTimeout(() => delete button.dataset.done, 1200);
    });
  }
})();
`;

function snippet(command: string) {
  return `<div class="snippet"><pre>${escape(command)}</pre><button class="copy" type="button" data-copy="${escape(command)}" aria-label="Copy command">${icon("copy", 16)}</button></div>`;
}

function terminal(view: Landing) {
  const host = view.baseUrl.replace(/^https?:\/\//, "");
  return `<div class="terminal">
<div class="terminal-head"><div class="lights"><span></span><span></span><span></span></div><div class="title">${escape(host)}</div></div>
<pre><span class="prompt">$ </span><span class="cmd">curl ${escape(host)}/v2/health</span>
<span class="dim">{</span>
  <span class="k">"ok"</span><span class="dim">:</span> <span class="n">true</span><span class="dim">,</span>
  <span class="k">"version"</span><span class="dim">:</span> <span class="s">"${escape(view.version)}"</span><span class="dim">,</span>
  <span class="k">"time"</span><span class="dim">:</span> <span class="s">"${escape(view.time)}"</span><span class="dim">,</span>
  <span class="k">"runtime"</span><span class="dim">:</span> <span class="s">"${escape(view.runtime)}"</span><span class="dim">,</span>
  <span class="dim">...</span>
<span class="dim">}</span>
<span class="prompt">$ </span><span class="caret"></span></pre>
</div>`;
}

function routeItem(route: RouteEntry) {
  const method = route.method === "ALL" ? "ANY" : route.method;
  const summary = route.summary ? inlineCode(route.summary) : "";
  return `<li><span class="method ${escape(method.toLowerCase())}">${escape(method)}</span><span class="path">${pathMarkup(route.path)}</span><span class="summary">${summary}</span></li>`;
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
 * @description Renders the API landing page as one HTML document: status, a sample health
 * response, the public facts about privacy, access and errors, a quick start, and every
 * documented route with a client-side filter.
 *
 * @example
 * const html = landingPage(landing({ version, time, runtime, baseUrl, groups }));
 */
export function landingPage(view: Landing): string {
  const total = view.groups.reduce((sum, group) => sum + group.routes.length, 0);
  const stats = [
    { value: total, label: "documented routes" },
    { value: view.groups.length, label: "route groups" },
    { value: 0, label: "visitor cookies" },
    { value: 0, label: "raw IPs stored" },
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#08080a">
<meta name="description" content="The v2 API for self-hosted, privacy-first web analytics: ingest, reads, sign-in and the SQL console.">
<title>${escape(view.name)}</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(mark.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg" color="#ededef"'))}">
<style>${styles}</style>
</head>
<body>
<header class="bar">
<div class="wrap">
<a class="brand" href="/">${mark}<span>analytics</span><span class="slash">/</span><span class="repo">api</span></a>
<nav class="nav">
<a href="#routes">Routes</a>
<a class="wide" href="${escape(view.links.guide)}">Guides</a>
<a href="${escape(view.links.docs)}">Reference</a>
<a class="wide" href="${escape(view.links.source)}">GitHub</a>
</nav>
</div>
</header>

<main class="wrap">
<div class="hero">
<div>
<span class="eyebrow"><span class="pulse"></span>Operational<span class="dim">/</span>v${escape(view.version)}</span>
<h1>${escape(view.name)}</h1>
<p class="lead">The API behind a self-hosted, privacy-first web analytics service. It takes events from the browser and server SDK and serves aggregate and visitor-level reads, error tracking, speed insights and a read-only SQL console. Every route lives under <code>/v2</code>.</p>
<div class="actions">
<a class="button primary" href="${escape(view.links.docs)}">API reference ${icon("arrow", 16)}</a>
<a class="button" href="${escape(view.links.guide)}">Guides and SDK</a>
<a class="button" href="${escape(view.links.openapi)}">OpenAPI JSON</a>
</div>
</div>
${terminal(view)}
</div>

<div class="stats">
${stats.map((stat) => `<div class="stat"><strong>${stat.value}</strong><span>${escape(stat.label)}</span></div>`).join("")}
</div>

<section>
<div class="section-head"><div><p class="kicker">Principles</p><h2>How it works</h2></div></div>
<div class="facts">
${facts.map((fact) => `<div class="fact"><span class="glyph">${icon(fact.icon)}</span><h3>${escape(fact.title)}</h3><p>${inlineCode(fact.body)}</p></div>`).join("\n")}
</div>
</section>

<section>
<div class="section-head"><div><p class="kicker">Quick start</p><h2>Try it from a terminal</h2></div></div>
<div class="steps">
<div class="step"><span class="step-n">1</span><div class="step-body"><p>Check that the API is up and which version it runs.</p>${snippet(`curl ${view.links.health}`)}</div></div>
<div class="step"><span class="step-n">2</span><div class="step-body"><p>Read the headline numbers of a public project for the last seven days.</p>${snippet(`curl "${view.baseUrl}/v2/projects/remcostoeten.nl/stats?period=7d"`)}</div></div>
<div class="step"><span class="step-n">3</span><div class="step-body"><p>Fetch the OpenAPI document to generate a client.</p>${snippet(`curl ${view.links.openapi}`)}</div></div>
</div>
</section>

<section id="routes">
<div class="section-head"><div><p class="kicker">Reference</p><h2>Routes</h2></div><span class="count">${total} routes</span></div>
<div class="routes">
<nav class="side">${view.groups.map((group) => `<a href="#${slug(group.name)}">${escape(group.name)}<span>${group.routes.length}</span></a>`).join("")}</nav>
<div>
<label class="search">${icon("search", 16)}<input id="filter" type="search" placeholder="Filter by path, method or summary" autocomplete="off" spellcheck="false"><kbd>/</kbd></label>
${view.groups.map(groupBlock).join("\n")}
<div class="empty">No routes match that filter.</div>
</div>
</div>
</section>
</main>

<footer>
<div class="wrap">
<span>Analytics API v${escape(view.version)} on ${escape(view.runtime)}</span>
<span><a href="${escape(view.links.source)}">Source</a> · Rendered <time datetime="${escape(view.time)}">${escape(view.time)}</time></span>
</div>
</footer>
<script>${script}</script>
</body>
</html>
`;
}
