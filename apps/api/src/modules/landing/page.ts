import type { HealthView, History, Landing, RouteEntry, RouteGroup } from "./service";

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

const mark = `<svg width="22" height="22" viewBox="0 0 26 26" fill="none" aria-hidden="true"><path d="M2 19 8 11l5 5 4-9 5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="19" r="2" fill="currentColor"/></svg>`;

const styles = `
:root {
  color-scheme: dark;
  --bg: #050505;
  --panel: #0c0c0d;
  --raised: #141416;
  --line: #1f1f23;
  --line-strong: #2a2a30;
  --text: #f2f2f2;
  --muted: #9b9ba3;
  --faint: #66666e;
  --ghost: #3a3a41;
  --mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace;
  --sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --gutter: clamp(16px, 4vw, 40px);
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; scroll-padding-top: 64px; }
body { margin: 0; background: var(--bg); color: var(--text); font: 14px/1.6 var(--sans); -webkit-font-smoothing: antialiased; }
::selection { background: var(--text); color: var(--bg); }
a { color: inherit; text-decoration: none; }
p { margin: 0; }
code { font-family: var(--mono); font-size: .9em; color: var(--text); background: var(--raised); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; }
.frame { max-width: 1080px; margin: 0 auto; border-left: 1px solid var(--line); border-right: 1px solid var(--line); min-height: 100vh; }

.bar { position: sticky; top: 0; z-index: 10; background: rgba(5,5,5,.8); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border-bottom: 1px solid var(--line); }
.bar .in { display: flex; align-items: center; justify-content: space-between; height: 52px; padding: 0 var(--gutter); }
.brand { display: flex; align-items: center; gap: 9px; font-weight: 600; letter-spacing: -.02em; font-size: 15px; }
.brand small { font-weight: 400; color: var(--faint); font-family: var(--mono); font-size: 12px; }
.nav { display: flex; gap: 2px; }
.nav a { color: var(--muted); font-size: 13px; padding: 5px 9px; border-radius: 5px; transition: color .15s, background .15s; }
.nav a:hover { color: var(--text); background: var(--raised); }

section { border-bottom: 1px solid var(--line); }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 20px var(--gutter) 14px; }
h2 { margin: 0; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
.count { font-family: var(--mono); font-size: 12px; color: var(--faint); white-space: nowrap; }

.kv { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--line); }
.kv div { padding: 14px var(--gutter); border-left: 1px solid var(--line); border-bottom: 1px solid var(--line); min-width: 0; }
.kv div:nth-child(4n+1) { border-left: 0; }
.kv div:nth-last-child(-n+4) { border-bottom: 0; }
.kv > div > span { display: block; font-family: var(--mono); font-size: 11px; color: var(--faint); text-transform: uppercase; letter-spacing: .08em; margin-bottom: 4px; }
.kv b { font-family: var(--mono); font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.live { display: inline-flex; align-items: center; gap: 8px; }
.pulse { position: relative; width: 7px; height: 7px; border-radius: 50%; background: var(--text); }
.pulse::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--text); animation: pulse 2.4s cubic-bezier(.2,.6,.4,1) infinite; }
@keyframes pulse { to { transform: scale(3.2); opacity: 0; } }

.chart { padding: 14px var(--gutter) 16px; border-top: 1px solid var(--line); }
.chart svg { display: block; width: 100%; height: 180px; overflow: visible; }
.chart text { font-family: var(--mono); font-size: 10px; fill: var(--faint); }
.chart .rules line { stroke: var(--line); stroke-dasharray: 2 4; }
.chart .area { fill: url(#fade); }
.chart .line { fill: none; stroke: var(--text); stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.chart .dots circle { fill: var(--bg); stroke: var(--text); stroke-width: 1.5; vector-effect: non-scaling-stroke; transition: fill .12s; }
.chart .dots circle:hover { fill: var(--text); }
.chart .axis { display: flex; justify-content: space-between; gap: 12px; font-family: var(--mono); font-size: 11px; color: var(--faint); margin-top: 10px; }
.chart .none { font-family: var(--mono); font-size: 12px; color: var(--faint); padding: 24px 0 14px; }

.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 0 var(--gutter) 14px; }
.toc { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 var(--gutter) 14px; }
.toc a { display: inline-flex; align-items: center; gap: 7px; padding: 4px 10px; border: 1px solid var(--line-strong); border-radius: 999px; color: var(--muted); font-size: 12.5px; transition: color .15s, border-color .15s, background .15s; }
.toc a:hover { color: var(--text); border-color: var(--faint); background: var(--raised); }
.toc a span { font-family: var(--mono); font-size: 11px; color: var(--faint); }
.search { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px; height: 36px; padding: 0 12px; border: 1px solid var(--line-strong); border-radius: 8px; background: var(--panel); color: var(--faint); transition: border-color .15s; }
.search:focus-within { border-color: var(--faint); }
.search input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: var(--text); font: 13px var(--sans); }
.search input::placeholder { color: var(--faint); }
.search input::-webkit-search-cancel-button { -webkit-appearance: none; }
kbd { font-family: var(--mono); font-size: 11px; color: var(--faint); border: 1px solid var(--line-strong); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; }
.tool { height: 36px; padding: 0 12px; border: 1px solid var(--line-strong); border-radius: 8px; background: transparent; color: var(--muted); font: 13px var(--sans); cursor: pointer; transition: color .15s, background .15s, border-color .15s; }
.tool:hover { color: var(--text); background: var(--raised); border-color: var(--faint); }

.group { border-top: 1px solid var(--line); }
.group summary { display: flex; align-items: center; gap: 12px; padding: 13px var(--gutter); cursor: pointer; list-style: none; transition: background .12s; }
.group summary::-webkit-details-marker { display: none; }
.group summary:hover { background: var(--panel); }
.group[open] > summary { background: var(--panel); border-bottom: 1px solid var(--line); }
.chev { flex: none; width: 7px; height: 7px; border-right: 1.5px solid var(--faint); border-bottom: 1.5px solid var(--faint); transform: rotate(-45deg); transition: transform .15s; margin-right: 2px; }
.group[open] .chev { transform: rotate(45deg); }
.gname { display: flex; flex: 1; flex-wrap: wrap; align-items: baseline; gap: 2px 12px; min-width: 0; }
.gname b { font-size: 14px; font-weight: 500; }
.gname small { color: var(--faint); font-size: 12.5px; }
.mix { font-family: var(--mono); font-size: 11px; color: var(--faint); white-space: nowrap; }
ul { list-style: none; margin: 0; padding: 0; }
li { display: grid; grid-template-columns: 66px minmax(0, 1.2fr) minmax(0, 1fr); align-items: baseline; gap: 4px 14px; padding: 8px var(--gutter); border-top: 1px solid var(--line); transition: background .12s; }
li:hover { background: var(--panel); }
.method { justify-self: start; font-family: var(--mono); font-size: 10px; font-weight: 600; letter-spacing: .06em; padding: 2px 6px; border-radius: 3px; border: 1px solid var(--line-strong); color: var(--muted); }
.method.get { color: var(--text); }
.method.post { background: var(--text); color: var(--bg); border-color: var(--text); }
.method.put, .method.patch { background: var(--ghost); color: var(--text); border-color: var(--ghost); }
.method.delete { color: var(--muted); border-style: dashed; }
.path { font-family: var(--mono); font-size: 12.5px; overflow-wrap: anywhere; }
.prefix { color: var(--ghost); }
.param { color: var(--muted); font-style: italic; }
.summary { color: var(--faint); font-size: 12.5px; }
.summary code { font-size: 11.5px; }
.empty { padding: 32px var(--gutter); color: var(--faint); font-family: var(--mono); font-size: 12.5px; border-top: 1px solid var(--line); }

footer { padding: 18px var(--gutter) 28px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; font-family: var(--mono); font-size: 12px; color: var(--faint); }
footer a:hover { color: var(--text); }

@media (max-width: 720px) {
  .nav a.wide { display: none; }
  .kv { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .kv div:nth-child(odd) { border-left: 0; }
  .kv div:nth-child(even) { border-left: 1px solid var(--line); }
  .kv div:nth-last-child(-n+4) { border-bottom: 1px solid var(--line); }
  .kv div:nth-last-child(-n+2) { border-bottom: 0; }
  li { grid-template-columns: minmax(0, 1fr); gap: 5px; }
  .mix { display: none; }
}
@media (prefers-reduced-motion: reduce) { .pulse::after { animation: none; } }
`;

function formatTime(iso: string) {
  const date = new Date(iso);
  const day = `${date.getUTCDate()} ${monthNames[date.getUTCMonth()] ?? ""} ${date.getUTCFullYear()}`;
  const clock = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  return `${day}, ${clock} UTC`;
}

function formatDay(iso: string) {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${monthNames[date.getUTCMonth()] ?? ""} ${date.getUTCFullYear()}`;
}

function formatSpan(milliseconds: number) {
  const minutes = Math.floor(milliseconds / 60_000);
  if (minutes < 1) return "under a minute";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

function timeCell(iso: string) {
  return `<time datetime="${escape(iso)}" data-local>${formatTime(iso)}</time>`;
}

function healthCells(health: HealthView) {
  const uptime = Math.max(0, Date.parse(health.time) - Date.parse(health.bootedAt));
  const cells = [
    ["status", `<span class="live"><span class="pulse"></span>ok</span>`],
    ["version", escape(health.version)],
    ["runtime", escape(health.runtime)],
    ["uptime", formatSpan(uptime)],
    ["server time", timeCell(health.time)],
    ["last cold start", timeCell(health.bootedAt)],
    ["geo city", health.geo.city ? "loaded" : "not loaded"],
    ["geo asn", health.geo.asn ? "loaded" : "not loaded"],
  ];
  return cells.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("");
}

const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function historyChart(history: History) {
  const width = 1040;
  const height = 180;
  const top = 16;
  const bottom = 24;
  const plot = height - top - bottom;
  const columns = Math.max(1, history.weeks.length - 1);
  const step = width / columns;
  let running = 0;
  const points = history.weeks.map((week, index) => {
    running += week.total;
    return { x: index * step, total: running, week };
  });
  const max = Math.max(1, running);
  function y(total: number) {
    return top + plot - (total / max) * plot;
  }
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${y(p.total).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width} ${top + plot} L0 ${top + plot} Z`;
  let lastMonth = -1;
  const months = points
    .flatMap((p) => {
      const month = new Date(p.week.week).getUTCMonth();
      if (month === lastMonth) return [];
      lastMonth = month;
      return [`<text x="${p.x.toFixed(1)}" y="${height - 6}">${monthNames[month] ?? ""}</text>`];
    })
    .slice(1)
    .join("");
  const dots = points
    .filter((p) => p.week.total > 0)
    .map(
      (p) =>
        `<circle cx="${p.x.toFixed(1)}" cy="${y(p.total).toFixed(1)}" r="3"><title>${escape(`${p.week.total} commit${p.week.total === 1 ? "" : "s"} in the week of ${formatDay(p.week.week)}, ${p.total} total`)}</title></circle>`,
    )
    .join("");
  const rules = [0.5, 1]
    .map(
      (share) =>
        `<line x1="0" x2="${width}" y1="${y(max * share).toFixed(1)}" y2="${y(max * share).toFixed(1)}"/>`,
    )
    .join("");
  return `<div class="chart"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Cumulative commits over the last year"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f2f2f2" stop-opacity=".16"/><stop offset="1" stop-color="#f2f2f2" stop-opacity="0"/></linearGradient></defs><g class="rules">${rules}</g><path class="area" d="${area}"/><path class="line" d="${line}"/><g class="dots">${dots}</g><g class="months">${months}</g></svg><div class="axis"><span>${history.total} commits in the last year</span><span>${formatDay(history.weeks[0]?.week ?? "")} to ${formatDay(history.weeks.at(-1)?.week ?? "")}</span></div></div>`;
}

function routeItem(route: RouteEntry) {
  const method = route.method === "ALL" ? "ANY" : route.method;
  const summary = route.summary ? inlineCode(route.summary) : "";
  return `<li><span class="method ${escape(method.toLowerCase())}">${escape(method)}</span><span class="path">${pathMarkup(route.path)}</span><span class="summary">${summary}</span></li>`;
}

function methodMix(group: RouteGroup) {
  const methods = new Set(
    group.routes.map((route) => (route.method === "ALL" ? "ANY" : route.method)),
  );
  return [...methods].join(" · ");
}

function groupBlock(group: RouteGroup) {
  return `<details class="group" id="${slug(group.name)}">
<summary><span class="chev"></span><span class="gname"><b>${escape(group.name)}</b><small>${escape(group.description)}</small></span><span class="mix">${escape(methodMix(group))}</span><span class="count">${group.routes.length}</span></summary>
<ul>${group.routes.map(routeItem).join("")}</ul>
</details>`;
}

function toc(groups: RouteGroup[]) {
  return `<nav class="toc" aria-label="Endpoint groups">${groups.map((group) => `<a href="#${slug(group.name)}">${escape(group.name)} <span>${group.routes.length}</span></a>`).join("")}</nav>`;
}

const script = `
(() => {
  const groups = [...document.querySelectorAll("details.group")];
  const input = document.getElementById("filter");
  const empty = document.querySelector(".empty");
  function openHash() {
    const group = groups.find((item) => item.id === location.hash.slice(1));
    if (group) group.open = true;
  }
  addEventListener("hashchange", openHash);
  openHash();
  document.querySelector("[data-expand]").addEventListener("click", () => {
    for (const group of groups) group.open = true;
  });
  document.querySelector("[data-collapse]").addEventListener("click", () => {
    for (const group of groups) group.open = false;
  });
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
      group.open = query ? visible > 0 : false;
      shown += visible;
    }
    empty.hidden = shown !== 0;
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "/" || document.activeElement === input) return;
    event.preventDefault();
    input.focus();
  });
  for (const time of document.querySelectorAll("time[data-local]")) {
    time.textContent = new Date(time.dateTime).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }
})();
`;

/**
 * @name landingPage
 * @description Renders the API landing page as one HTML document: the health details, the
 * commits per day for the last year when they loaded, and every documented route by tag.
 *
 * @example
 * const html = landingPage(landing({ baseUrl, health, groups, history }));
 */
export function landingPage(view: Landing): string {
  const total = view.groups.reduce((sum, group) => sum + group.routes.length, 0);
  const chart = view.history
    ? historyChart(view.history)
    : `<div class="chart"><p class="none">Commit history is not available right now.</p></div>`;
  const historyCount = view.history
    ? `${view.history.total} commits, ${view.history.weeks.length} weeks`
    : "";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#050505">
<meta name="description" content="Spoar API: health, endpoints and commit history.">
<title>${escape(view.name)}</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(mark.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg" color="#f2f2f2"'))}">
<style>${styles}</style>
</head>
<body>
<div class="frame">
<header class="bar"><div class="in">
<a class="brand" href="/">${mark}<span>spoar</span><small>api</small></a>
<nav class="nav"><a href="#health">Health</a><a href="#history">History</a><a href="#endpoints">Endpoints</a><a class="wide" href="${escape(view.links.docs)}">Reference</a><a class="wide" href="${escape(view.links.source)}">GitHub</a></nav>
</div></header>

<section id="health">
<div class="head"><h2>Health</h2><a class="count" href="${escape(view.links.health)}">/v2/health</a></div>
<div class="kv">${healthCells(view.health)}</div>
</section>

<section id="history">
<div class="head"><h2>Git history</h2><a class="count" href="${escape(view.links.source)}">${escape(historyCount || "github.com/remcostoeten/analytics")}</a></div>
${chart}
</section>

<section id="endpoints">
<div class="head"><h2>Endpoints</h2><a class="count" href="${escape(view.links.openapi)}">${total} routes · openapi.json</a></div>
${toc(view.groups)}
<div class="toolbar">
<label class="search"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="filter" type="search" placeholder="Filter by path, method or summary" autocomplete="off" spellcheck="false"><kbd>/</kbd></label>
<button class="tool" type="button" data-expand>Expand all</button>
<button class="tool" type="button" data-collapse>Collapse all</button>
</div>
${view.groups.map(groupBlock).join("\n")}
<p class="empty" hidden>No routes match that filter.</p>
</section>

<footer><span>${escape(view.name)} ${escape(view.health.version)}</span><span><a href="${escape(view.links.docs)}">Reference</a> · <a href="${escape(view.links.source)}">Source</a></span></footer>
</div>
<script>${script}</script>
</body>
</html>
`;
}
