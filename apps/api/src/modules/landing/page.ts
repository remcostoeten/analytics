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
.chart .grid { overflow-x: auto; }
.chart svg { display: block; }
.chart text { font-family: var(--mono); font-size: 10px; fill: var(--faint); }
.chart rect { transition: stroke .12s; stroke: transparent; stroke-width: 1; }
.chart rect:hover { stroke: var(--text); }
.chart .l0, .chart i.l0 { fill: #141416; background: #141416; }
.chart .l1, .chart i.l1 { fill: #35353b; background: #35353b; }
.chart .l2, .chart i.l2 { fill: #6b6b74; background: #6b6b74; }
.chart .l3, .chart i.l3 { fill: #a8a8b0; background: #a8a8b0; }
.chart .l4, .chart i.l4 { fill: #f2f2f2; background: #f2f2f2; }
.chart .axis { display: flex; justify-content: space-between; align-items: center; gap: 12px; font-family: var(--mono); font-size: 11px; color: var(--faint); margin-top: 10px; }
.chart .legend { display: inline-flex; align-items: center; gap: 3px; }
.chart .legend i { width: 10px; height: 10px; border-radius: 2px; }
.chart .legend i:first-of-type { margin-left: 4px; }
.chart .legend i:last-of-type { margin-right: 4px; }
.chart .none { font-family: var(--mono); font-size: 12px; color: var(--faint); padding: 24px 0 14px; }

.group-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 18px var(--gutter) 8px; border-top: 1px solid var(--line); }
.group-head h3 { margin: 0; font-size: 14px; font-weight: 500; }
.group-head p { color: var(--faint); font-size: 12.5px; }
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
}
@media (prefers-reduced-motion: reduce) { .pulse::after { animation: none; } }
`;

function healthCells(health: HealthView) {
  const uptime = Math.max(0, Date.parse(health.time) - Date.parse(health.bootedAt));
  const minutes = Math.floor(uptime / 60_000);
  const cells = [
    ["status", `<span class="live"><span class="pulse"></span>ok</span>`],
    ["version", escape(health.version)],
    ["runtime", escape(health.runtime)],
    [
      "uptime",
      minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`,
    ],
    ["time", escape(health.time)],
    ["booted", escape(health.bootedAt)],
    ["geo city", health.geo.city ? escape(health.geo.city) : "not loaded"],
    ["geo asn", health.geo.asn ? escape(health.geo.asn) : "not loaded"],
  ];
  return cells.map(([label, value]) => `<div><span>${label}</span><b>${value}</b></div>`).join("");
}

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

function level(count: number, max: number) {
  if (count === 0) return 0;
  const share = count / max;
  if (share > 0.75) return 4;
  if (share > 0.5) return 3;
  if (share > 0.25) return 2;
  return 1;
}

function historyChart(history: History) {
  const cell = 12;
  const gap = 3;
  const left = 30;
  const top = 18;
  const columns = history.weeks.length;
  const width = left + columns * (cell + gap);
  const height = top + 7 * (cell + gap);
  const max = Math.max(1, ...history.weeks.flatMap((week) => week.days));
  const months: string[] = [];
  let lastMonth = -1;
  const cells = history.weeks
    .flatMap((week, column) => {
      const start = new Date(week.week);
      const month = start.getUTCMonth();
      if (month !== lastMonth && (column === 0 || start.getUTCDate() <= 7)) {
        lastMonth = month;
        months.push(
          `<text x="${left + column * (cell + gap)}" y="11">${monthNames[month] ?? ""}</text>`,
        );
      }
      return week.days.map((count, row) => {
        const date = new Date(start.getTime() + row * 86_400_000).toISOString().slice(0, 10);
        const label = `${count} commit${count === 1 ? "" : "s"} on ${date}`;
        return `<rect class="l${level(count, max)}" x="${left + column * (cell + gap)}" y="${top + row * (cell + gap)}" width="${cell}" height="${cell}" rx="2"><title>${escape(label)}</title></rect>`;
      });
    })
    .join("");
  const days = [1, 3, 5]
    .map((row) => `<text x="0" y="${top + row * (cell + gap) + cell - 2}">${dayNames[row]}</text>`)
    .join("");
  const legend = [0, 1, 2, 3, 4].map((step) => `<i class="l${step}"></i>`).join("");
  return `<div class="chart"><div class="grid"><svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Commits per day for the last year">${months.join("")}${days}${cells}</svg></div><div class="axis"><span>${history.total} commits in the last year</span><span class="legend">less ${legend} more</span></div></div>`;
}

function routeItem(route: RouteEntry) {
  const method = route.method === "ALL" ? "ANY" : route.method;
  const summary = route.summary ? inlineCode(route.summary) : "";
  return `<li><span class="method ${escape(method.toLowerCase())}">${escape(method)}</span><span class="path">${pathMarkup(route.path)}</span><span class="summary">${summary}</span></li>`;
}

function groupBlock(group: RouteGroup) {
  return `<div class="group" id="${slug(group.name)}">
<div class="group-head"><div><h3>${escape(group.name)}</h3><p>${escape(group.description)}</p></div><span class="count">${group.routes.length}</span></div>
<ul>${group.routes.map(routeItem).join("")}</ul>
</div>`;
}

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
${view.groups.map(groupBlock).join("\n")}
</section>

<footer><span>${escape(view.name)} ${escape(view.health.version)}</span><span><a href="${escape(view.links.docs)}">Reference</a> · <a href="${escape(view.links.source)}">Source</a></span></footer>
</div>
</body>
</html>
`;
}
