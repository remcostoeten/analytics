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
  --bg: #fafafa;
  --surface: #ffffff;
  --fg: #0a0a0a;
  --muted: #6b6b6b;
  --line: #d9d9d9;
  --accent: #fe5101;
  --ok: #1fae78;
  --warn: #b7791f;
  --err: #e5484d;
  --sans: "Geist", ui-sans-serif, system-ui, sans-serif;
  --mono: "Geist Mono", ui-monospace, "SFMono-Regular", monospace;
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --wash: color-mix(in srgb, var(--fg) 7%, transparent);
  --wash-selected: color-mix(in srgb, var(--fg) 12%, transparent);
  --page: min(1040px, calc(100% - 32px));
  color-scheme: light;
  color: var(--fg);
  background: var(--bg);
  font-family: var(--sans);
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0a0a0a;
    --surface: #111111;
    --fg: #ededed;
    --muted: #8a8a8a;
    --line: #262626;
    --ok: #54f2b3;
    --warn: #f5b544;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--muted) 45%, transparent) transparent; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; scroll-padding-top: 72px; }
body { margin: 0; background: var(--bg); font-size: 0.875rem; line-height: normal; -webkit-font-smoothing: antialiased; }
::selection { background: var(--fg); color: var(--bg); }
a { color: inherit; text-decoration: none; }
p, h1, h2, h3 { margin: 0; }
code { font-family: var(--mono); font-size: 0.9em; background: var(--wash); border-radius: 4px; padding: 1px 5px; }
.caps { font-family: var(--mono); font-size: 0.72rem; font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }
.num { font-variant-numeric: tabular-nums; }
.link { text-decoration: underline; text-decoration-color: var(--line); text-underline-offset: 3px; transition: text-decoration-color 140ms var(--ease-out); }
.link:hover, .link:focus-visible { text-decoration-color: var(--accent); outline: none; }

.dots { background-color: var(--bg); background-image: radial-gradient(var(--line) 1px, transparent 1px); background-size: 16px 16px; }
.top { position: sticky; top: 0; z-index: 10; border-bottom: 1px dashed var(--line); }
.top .in { width: var(--page); margin: 0 auto; display: flex; align-items: center; gap: 12px; min-height: 56px; }
.brand { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; font-size: 1rem; letter-spacing: -0.02em; }
.context { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); padding: 3px 10px; color: var(--muted); }
.live { position: relative; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent); animation: beat 1s ease-in-out infinite alternate; }
@keyframes beat { to { opacity: 0.45; } }
.spacer { flex: 1; }
.nav { display: flex; gap: 2px; }
.ghost, .outline, .primary, .chip { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 6px; cursor: pointer; transition: background 140ms var(--ease-out), color 140ms var(--ease-out), border-color 140ms var(--ease-out), transform 120ms var(--ease-out); }
.ghost { height: 28px; padding: 0 10px; border: 1px solid transparent; background: transparent; color: var(--muted); }
.outline { height: 28px; padding: 0 10px; border: 1px solid var(--line); background: var(--surface); color: var(--muted); }
.ghost:hover, .outline:hover, .chip:hover, .ghost:focus-visible, .outline:focus-visible, .chip:focus-visible { background: var(--wash); color: var(--fg); outline: none; }
.primary { padding: 12px 18px; border: 1px solid transparent; background: var(--fg); color: var(--bg); }
.primary:hover, .primary:focus-visible { background: var(--accent); color: #fff; }
.primary:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 2px; }
.primary:active { transform: scale(0.97); }
.ghost:active, .outline:active, .chip:active { transform: none; }

main { width: var(--page); margin: 0 auto; border-left: 1px dashed var(--line); border-right: 1px dashed var(--line); }
main > section { position: relative; padding: 32px; border-bottom: 1px dashed var(--line); }
main > section::before, main > section::after { content: ""; position: absolute; bottom: -4px; width: 7px; height: 7px; background: var(--bg); border: 1px solid var(--line); }
main > section::before { left: -4px; }
main > section::after { right: -4px; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.head h2 { font-size: 0.72rem; }
.head .meta { color: var(--muted); }

.card { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); padding: 16px; }
.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.stat { transition: transform 150ms var(--ease-out), background 150ms var(--ease-out), border-color 150ms var(--ease-out); }
.stat:hover { transform: translateY(-2px); background: color-mix(in srgb, var(--accent) 5%, var(--surface)); }
.stat > span { display: block; margin-bottom: 8px; color: var(--muted); font-size: 0.62rem; }
.stat b { display: block; font-family: var(--mono); font-size: 0.85rem; font-weight: 500; overflow-wrap: anywhere; }
.pill { display: inline-flex; align-items: center; gap: 6px; border: 1px solid var(--line); border-radius: 999px; padding: 1px 8px; font-size: 0.65rem; }
.pill::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--muted); }
.pill[data-state="ok"]::before { background: var(--ok); }

.chart .scroll { overflow-x: auto; }
.chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart text { font-family: var(--mono); font-size: 10px; fill: var(--muted); }
.chart .rules line { stroke: var(--line); stroke-dasharray: 3 4; }
.chart .line { fill: none; stroke: var(--fg); stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linejoin: round; }
.chart .dot { fill: var(--surface); stroke: var(--fg); stroke-width: 1.5; vector-effect: non-scaling-stroke; transition: fill 120ms var(--ease-out); }
.chart .dot:hover { fill: var(--fg); }
.chart .dot.now { fill: var(--accent); stroke: var(--accent); }
.chart .axis { display: flex; justify-content: space-between; gap: 12px; margin-top: 10px; color: var(--muted); font-family: var(--mono); font-size: 0.65rem; }
.empty { border: 1px dashed var(--line); border-radius: 10px; padding: 40px 16px; text-align: center; color: var(--muted); }

.toc { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.chip { height: 28px; padding: 0 10px; border: 1px solid var(--line); background: var(--surface); color: var(--muted); font-size: 0.75rem; font-weight: 500; }
.chip span { font-family: var(--mono); font-size: 0.65rem; opacity: 0.6; }
.chip[aria-current="true"] { background: var(--wash-selected); color: var(--fg); }
.toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
.search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; height: 28px; padding: 0 10px; border: 1px solid var(--line); border-radius: 6px; background: var(--surface); color: var(--muted); transition: border-color 140ms var(--ease-out); }
.search:focus-within { border-color: color-mix(in srgb, var(--accent) 60%, var(--line)); }
.search input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: var(--fg); font: 0.75rem var(--mono); }
.search input::placeholder { color: var(--muted); }
.search input::-webkit-search-cancel-button { -webkit-appearance: none; }
kbd { font-family: var(--mono); font-size: 0.62rem; color: var(--muted); border: 1px solid var(--line); border-radius: 4px; padding: 0 5px; }

.groups { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); overflow: hidden; }
.group + .group { border-top: 1px solid var(--line); }
.group summary { display: flex; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; list-style: none; transition: background 140ms var(--ease-out); }
.group summary::-webkit-details-marker { display: none; }
.group summary:hover, .group summary:focus-visible, .group[open] > summary { background: var(--wash); outline: none; }
.group:target > summary { box-shadow: inset 3px 0 0 var(--accent); }
.chev { flex: none; width: 6px; height: 6px; border-right: 1.5px solid var(--muted); border-bottom: 1.5px solid var(--muted); transform: rotate(45deg) translateY(-1px); transition: transform 180ms var(--ease-out); }
.group[open] .chev { transform: rotate(225deg) translateY(-1px); }
.gname { display: flex; flex: 1; flex-wrap: wrap; align-items: baseline; gap: 2px 12px; min-width: 0; }
.gname b { font-size: 0.9rem; font-weight: 500; letter-spacing: -0.01em; }
.gname small { color: var(--muted); font-size: 0.75rem; }
.mix { color: var(--muted); font-size: 0.62rem; white-space: nowrap; }
.group .count { color: var(--muted); font-size: 0.72rem; }
ul { list-style: none; margin: 0; padding: 0; }
li { display: grid; grid-template-columns: 72px minmax(0, 1.3fr) minmax(0, 1fr); align-items: baseline; gap: 4px 14px; padding: 8px 16px; border-top: 1px solid var(--line); transition: background 120ms var(--ease-out); }
li:hover { background: var(--wash); }
.badge { justify-self: start; border-radius: 999px; padding: 2px 8px; font-size: 0.65rem; background: color-mix(in srgb, var(--muted) 15%, transparent); color: var(--muted); }
.badge.post { background: color-mix(in srgb, var(--ok) 15%, transparent); color: var(--ok); }
.badge.put, .badge.patch { background: color-mix(in srgb, var(--warn) 15%, transparent); color: var(--warn); }
.badge.delete { background: color-mix(in srgb, var(--err) 15%, transparent); color: var(--err); }
.path { font-family: var(--mono); font-size: 0.78rem; overflow-wrap: anywhere; }
.prefix { color: var(--muted); opacity: 0.55; }
.param { color: var(--muted); font-style: italic; }
.summary { color: var(--muted); font-size: 0.8rem; }
.summary code { font-size: 0.72rem; }

footer { position: sticky; bottom: 0; z-index: 5; border-top: 1px dashed var(--line); }
footer .in { width: var(--page); margin: 0 auto; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; padding: 10px 0; color: var(--muted); font-family: var(--mono); font-size: 0.75rem; }

@media (max-width: 620px) {
  main > section { padding: 20px; }
  .nav, .context .host { display: none; }
  .primary { padding: 8px 12px; }
  .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .chart svg { min-width: 640px; }
  li { grid-template-columns: minmax(0, 1fr); gap: 5px; }
  .mix { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
`;

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

function formatDay(iso: string) {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${monthNames[date.getUTCMonth()] ?? ""} ${date.getUTCFullYear()}`;
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const clock = `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
  return `${formatDay(iso)}, ${clock} UTC`;
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
    ["status", `<span class="pill caps" data-state="ok">ok</span>`],
    ["version", escape(health.version)],
    ["runtime", escape(health.runtime)],
    ["uptime", formatSpan(uptime)],
    ["server time", timeCell(health.time)],
    ["last cold start", timeCell(health.bootedAt)],
    ["geo city", health.geo.city ? "loaded" : "not loaded"],
    ["geo asn", health.geo.asn ? "loaded" : "not loaded"],
  ];
  return cells
    .map(
      ([label, value]) =>
        `<div class="card stat"><span class="caps">${label}</span><b class="num">${value}</b></div>`,
    )
    .join("");
}

function historyChart(history: History) {
  const width = 1000;
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
  const final = points.length - 1;
  const dots = points
    .map((p, index) => ({ p, index }))
    .filter(({ p, index }) => p.week.total > 0 || index === final)
    .map(({ p, index }) => {
      const label = `${p.week.total} commit${p.week.total === 1 ? "" : "s"} in the week of ${formatDay(p.week.week)}, ${p.total} total`;
      return `<circle class="dot${index === final ? " now" : ""}" cx="${p.x.toFixed(1)}" cy="${y(p.total).toFixed(1)}" r="3.5"><title>${escape(label)}</title></circle>`;
    })
    .join("");
  const rules = [0.5, 1]
    .map(
      (share) =>
        `<line x1="0" x2="${width}" y1="${y(max * share).toFixed(1)}" y2="${y(max * share).toFixed(1)}"/>`,
    )
    .join("");
  return `<div class="card chart"><div class="scroll"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Cumulative commits over the last year"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--fg);stop-opacity:.14"/><stop offset="1" style="stop-color:var(--fg);stop-opacity:0"/></linearGradient></defs><g class="rules">${rules}</g><path d="${area}" style="fill:url(#fade)"/><path class="line" d="${line}"/><g>${dots}</g><g class="months">${months}</g></svg></div><div class="axis"><span>${history.total} commits in the last year</span><span>${formatDay(history.weeks[0]?.week ?? "")} to ${formatDay(history.weeks.at(-1)?.week ?? "")}</span></div></div>`;
}

function routeItem(route: RouteEntry) {
  const method = route.method === "ALL" ? "ANY" : route.method;
  const summary = route.summary ? inlineCode(route.summary) : "";
  return `<li><span class="badge caps ${escape(method.toLowerCase())}">${escape(method)}</span><span class="path">${pathMarkup(route.path)}</span><span class="summary">${summary}</span></li>`;
}

function methodMix(group: RouteGroup) {
  const methods = new Set(
    group.routes.map((route) => (route.method === "ALL" ? "ANY" : route.method)),
  );
  return [...methods].join(" · ");
}

function groupBlock(group: RouteGroup) {
  return `<details class="group" id="${slug(group.name)}">
<summary><span class="chev"></span><span class="gname"><b>${escape(group.name)}</b><small>${escape(group.description)}</small></span><span class="mix caps">${escape(methodMix(group))}</span><span class="count num">${group.routes.length}</span></summary>
<ul>${group.routes.map(routeItem).join("")}</ul>
</details>`;
}

function toc(groups: RouteGroup[]) {
  return `<nav class="toc" aria-label="Endpoint groups">${groups.map((group) => `<a class="chip" href="#${slug(group.name)}">${escape(group.name)} <span>${group.routes.length}</span></a>`).join("")}</nav>`;
}

const script = `
(() => {
  const groups = [...document.querySelectorAll("details.group")];
  const chips = [...document.querySelectorAll(".toc a")];
  const input = document.getElementById("filter");
  const empty = document.querySelector(".empty");
  function sync() {
    const id = location.hash.slice(1);
    const group = groups.find((item) => item.id === id);
    if (group) group.open = true;
    for (const chip of chips) chip.setAttribute("aria-current", String(chip.hash.slice(1) === id));
  }
  addEventListener("hashchange", sync);
  sync();
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
  for (const scroller of document.querySelectorAll(".chart .scroll")) scroller.scrollLeft = scroller.scrollWidth;
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
 * @description Renders the API landing page as one HTML document in the framed, dashed-line
 * design system: the health details, the commits per week for the last year when they loaded,
 * and every documented route in collapsible groups with a table of contents and a filter.
 *
 * @example
 * const html = landingPage(landing({ baseUrl, health, groups, history }));
 */
export function landingPage(view: Landing): string {
  const total = view.groups.reduce((sum, group) => sum + group.routes.length, 0);
  const host = view.baseUrl.replace(/^https?:\/\//, "");
  const chart = view.history
    ? historyChart(view.history)
    : `<p class="empty caps">Commit history is not available right now</p>`;
  const historyCount = view.history
    ? `${view.history.total} commits, ${view.history.weeks.length} weeks`
    : "github.com/remcostoeten/analytics";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="theme-color" content="#fafafa" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)">
<meta name="description" content="Spoar API: health, git history and endpoints.">
<title>${escape(view.name)}</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(mark.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg" color="#8a8a8a"'))}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap">
<style>${styles}</style>
</head>
<body>
<header class="top dots"><div class="in">
<a class="brand" href="/">${mark}<span>spoar</span></a>
<span class="context caps"><span class="live"></span><span class="host">${escape(host)}</span></span>
<span class="spacer"></span>
<nav class="nav"><a class="ghost caps" href="#health">Health</a><a class="ghost caps" href="#history">History</a><a class="ghost caps" href="#endpoints">Endpoints</a><a class="ghost caps" href="${escape(view.links.source)}">GitHub</a></nav>
<a class="primary caps" href="${escape(view.links.docs)}">Reference</a>
</div></header>

<main>
<section id="health">
<div class="head"><h2 class="caps">Health</h2><a class="meta link caps" href="${escape(view.links.health)}">/v2/health</a></div>
<div class="stats">${healthCells(view.health)}</div>
</section>

<section id="history">
<div class="head"><h2 class="caps">Git history</h2><a class="meta link caps" href="${escape(view.links.source)}">${escape(historyCount)}</a></div>
${chart}
</section>

<section id="endpoints">
<div class="head"><h2 class="caps">Endpoints</h2><a class="meta link caps" href="${escape(view.links.openapi)}">${total} routes · openapi.json</a></div>
${toc(view.groups)}
<div class="toolbar">
<label class="search"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="filter" type="search" placeholder="Filter by path, method or summary" autocomplete="off" spellcheck="false" aria-label="Filter endpoints"><kbd>/</kbd></label>
<button class="outline caps" type="button" data-expand>Expand all</button>
<button class="outline caps" type="button" data-collapse>Collapse all</button>
</div>
<div class="groups">
${view.groups.map(groupBlock).join("\n")}
</div>
<p class="empty caps" hidden>No routes match that filter</p>
</section>
</main>

<footer class="dots"><div class="in"><span>${escape(view.name)} ${escape(view.health.version)} on ${escape(view.health.runtime)}</span><span><a class="link" href="${escape(view.links.docs)}">Reference</a> · <a class="link" href="${escape(view.links.source)}">Source</a></span></div></footer>
<script>${script}</script>
</body>
</html>
`;
}
