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

const mark = `<svg class="mark" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect class="tile" width="28" height="28" rx="8"/><path class="trace" pathLength="1" d="M5 19 10 11 14.5 16 18.5 8 23 19"/><circle class="end" cx="23" cy="19" r="2.6"/></svg>`;

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><rect width="28" height="28" rx="8" fill="#0a0a0a"/><path d="M5 19 10 11 14.5 16 18.5 8 23 19" fill="none" stroke="#fafafa" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="23" cy="19" r="2.6" fill="#fe5101"/></svg>`;

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
  :root:not([data-theme="light"]) {
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
:root[data-theme="dark"] {
  --bg: #0a0a0a;
  --surface: #111111;
  --fg: #ededed;
  --muted: #8a8a8a;
  --line: #262626;
  --ok: #54f2b3;
  --warn: #f5b544;
  color-scheme: dark;
}
* { box-sizing: border-box; scrollbar-width: thin; scrollbar-color: color-mix(in srgb, var(--muted) 45%, transparent) transparent; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; scroll-padding-top: 72px; }
body { margin: 0; background: var(--bg); color: var(--fg); font-size: 0.875rem; line-height: normal; -webkit-font-smoothing: antialiased; }
::selection { background: var(--fg); color: var(--bg); }
a { color: inherit; text-decoration: none; }
p, h1, h2, h3 { margin: 0; }
code { font-family: var(--mono); font-size: 0.9em; background: var(--wash); border-radius: 4px; padding: 1px 5px; }
.caps { font-family: var(--mono); font-size: 0.72rem; font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }
.num { font-variant-numeric: tabular-nums; }
.link { text-decoration: underline; text-decoration-color: var(--line); text-underline-offset: 3px; transition: text-decoration-color 140ms var(--ease-out); }
.link:hover, .link:focus-visible { text-decoration-color: var(--accent); outline: none; }

.top, main, footer { color: var(--fg); }
.dots { background-color: var(--bg); background-image: radial-gradient(var(--line) 1px, transparent 1px); background-size: 16px 16px; }
.top { position: sticky; top: 0; z-index: 10; border-bottom: 1px dashed var(--line); background-color: color-mix(in srgb, var(--bg) 78%, transparent); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
.top .in { width: var(--page); margin: 0 auto; padding: 0 32px; display: flex; align-items: center; gap: 12px; min-height: 60px; }
.brand { display: inline-flex; align-items: center; gap: 10px; font-size: 1.05rem; font-weight: 700; letter-spacing: -0.03em; }
.mark { flex: none; }
.mark .tile { fill: var(--fg); }
.mark .trace { fill: none; stroke: var(--bg); stroke-width: 2.6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 0; }
.mark .end { fill: var(--accent); transform-box: fill-box; transform-origin: center; }
.brand:hover .trace, .brand:focus-visible .trace { animation: trace 650ms var(--ease-out); }
.brand:hover .end, .brand:focus-visible .end { animation: pop 650ms var(--ease-out); }
.brand:focus-visible { outline: none; }
@keyframes trace { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
@keyframes pop { 0%, 55% { transform: scale(0); } 100% { transform: scale(1); } }
.context { display: inline-flex; align-items: center; gap: 8px; border: 1px solid var(--line); border-radius: 999px; background: var(--surface); padding: 3px 10px; color: var(--muted); }
.live { position: relative; width: 6px; height: 6px; border-radius: 50%; background: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent); animation: beat 1s ease-in-out infinite alternate; }
@keyframes beat { to { opacity: 0.45; } }
.spacer { flex: 1; }
.nav { display: flex; gap: 2px; padding: 3px; border: 1px solid var(--line); border-radius: 999px; background: color-mix(in srgb, var(--surface) 80%, transparent); }
.nav a { display: inline-flex; align-items: center; height: 24px; padding: 0 12px; border-radius: 999px; color: var(--muted); font-size: 0.68rem; transition: background 140ms var(--ease-out), color 140ms var(--ease-out); }
.nav a:hover, .nav a:focus-visible { background: var(--wash); color: var(--fg); outline: none; }
.nav a[aria-current="true"] { background: var(--wash-selected); color: var(--fg); }
.ghost, .outline, .primary, .chip { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 6px; cursor: pointer; transition: background 140ms var(--ease-out), color 140ms var(--ease-out), border-color 140ms var(--ease-out); }
.ghost { height: 28px; padding: 0 10px; border: 1px solid transparent; background: transparent; color: var(--muted); }
.outline { height: 28px; padding: 0 10px; border: 1px solid var(--line); background: var(--surface); color: var(--muted); }
.ghost:hover, .outline:hover, .chip:hover, .ghost:focus-visible, .outline:focus-visible, .chip:focus-visible { background: var(--wash); color: var(--fg); outline: none; }
.primary { height: 28px; padding: 0 12px; border: 1px solid transparent; background: var(--fg); color: var(--bg); font-size: 0.68rem; }
.primary:hover, .primary:focus-visible { background: var(--accent); color: #fff; }
.primary:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 2px; }

main { width: var(--page); margin: 0 auto; border-left: 1px dashed var(--line); border-right: 1px dashed var(--line); }
main > section { position: relative; padding: 32px; border-bottom: 1px dashed var(--line); }
main > section::before, main > section::after { content: ""; position: absolute; bottom: -4px; width: 7px; height: 7px; background: var(--bg); border: 1px solid var(--line); }
main > section::before { left: -4px; }
main > section::after { right: -4px; }
.head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.head h2 { font-size: 0.72rem; }
.head .meta { color: var(--muted); }

.card { border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.chart { padding: 16px; }
.vitals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.vitals > div { padding: 18px 20px; border-left: 1px dashed var(--line); min-width: 0; }
.vitals > div:first-child { border-left: 0; }
.vitals span, .kv dt { display: block; color: var(--muted); font-size: 0.62rem; }
.vitals b { display: flex; align-items: center; gap: 10px; margin-top: 8px; font-size: 1.3rem; font-weight: 500; letter-spacing: -0.01em; line-height: 1.2; overflow-wrap: anywhere; }
.tag { border-radius: 999px; padding: 2px 8px; font-size: 0.62rem; letter-spacing: 0.02em; background: color-mix(in srgb, var(--warn) 15%, transparent); color: var(--warn); }
.state { flex: none; position: relative; width: 8px; height: 8px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px color-mix(in srgb, var(--ok) 25%, transparent); }
.kv { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 0; border-top: 1px dashed var(--line); }
.kv > div { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; padding: 11px 20px; border-bottom: 1px dashed var(--line); min-width: 0; }
.kv > div:nth-child(even) { border-left: 1px dashed var(--line); }
.kv > div:nth-last-child(-n+2) { border-bottom: 0; }
.kv dt { margin: 0; flex: none; }
.kv dd { margin: 0; font-family: var(--mono); font-size: 0.8rem; text-align: right; overflow-wrap: anywhere; }
.chart .scroll { overflow-x: auto; }
.chart svg { display: block; width: 100%; height: auto; overflow: visible; }
.chart text { font-family: var(--mono); font-size: 10px; fill: var(--muted); }
.chart .rules line { stroke: var(--line); stroke-dasharray: 3 4; }
.chart .line { fill: none; stroke: url(#stroke); stroke-width: 1.5; vector-effect: non-scaling-stroke; stroke-linejoin: round; filter: drop-shadow(0 0 5px color-mix(in srgb, var(--accent) 38%, transparent)); }
.chart .halo { fill: color-mix(in srgb, var(--accent) 22%, transparent); }
.chart .dot { fill: var(--surface); stroke: var(--fg); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
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
.group summary { display: grid; grid-template-columns: 8px 180px minmax(0, 1fr) auto 28px; grid-template-areas: "chev name desc mix count"; align-items: center; gap: 12px; padding: 12px 16px; cursor: pointer; list-style: none; transition: background 140ms var(--ease-out); }
.group summary::-webkit-details-marker { display: none; }
.group summary:hover, .group summary:focus-visible, .group[open] > summary { background: var(--wash); outline: none; }
.group:target > summary { box-shadow: inset 3px 0 0 var(--accent); }
.chev { grid-area: chev; width: 6px; height: 6px; border-right: 1.5px solid var(--muted); border-bottom: 1.5px solid var(--muted); transform: rotate(45deg) translateY(-1px); transition: transform 180ms var(--ease-out); }
.group[open] .chev { transform: rotate(225deg) translateY(-1px); }
.gname { grid-area: name; font-size: 0.9rem; font-weight: 500; letter-spacing: -0.01em; }
.gdesc { grid-area: desc; color: var(--muted); font-size: 0.75rem; min-width: 0; }
.mix { grid-area: mix; color: var(--muted); font-size: 0.62rem; white-space: nowrap; }
.group .count { grid-area: count; color: var(--muted); font-size: 0.72rem; text-align: right; }
ul { list-style: none; margin: 0; padding: 0; }
li { display: grid; grid-template-columns: 64px minmax(0, 1.4fr) minmax(0, 1fr); align-items: baseline; gap: 4px 14px; padding: 9px 16px 9px 36px; border-top: 1px solid var(--line); }
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
footer .in { width: var(--page); margin: 0 auto; padding: 10px 32px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; color: var(--muted); font-family: var(--mono); font-size: 0.75rem; }

@media (max-width: 620px) {
  main > section { padding: 20px; }
  .top .in, footer .in { padding-left: 20px; padding-right: 20px; }
  .nav, .context .host, .wide { display: none; }
  .vitals { grid-template-columns: minmax(0, 1fr); }
  .vitals > div { border-left: 0; border-top: 1px dashed var(--line); }
  .vitals > div:first-child { border-top: 0; }
  .kv { grid-template-columns: minmax(0, 1fr); }
  .kv > div:nth-child(even) { border-left: 0; }
  .kv > div:nth-last-child(-n+2) { border-bottom: 1px dashed var(--line); }
  .kv > div:last-child { border-bottom: 0; }
  .chart svg { min-width: 640px; }
  li { grid-template-columns: minmax(0, 1fr); gap: 5px; }
  .group summary { grid-template-columns: 8px minmax(0, 1fr) 28px; grid-template-areas: "chev name count" ". desc desc"; gap: 2px 12px; }
  .mix { display: none; }
  li { padding-left: 16px; }
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

function splitVersion(version: string) {
  const [number = version, tag = ""] = version.split("-");
  return { number, tag };
}

function healthBlock(health: HealthView) {
  const version = splitVersion(health.version);
  const uptime = Math.max(0, Date.parse(health.time) - Date.parse(health.bootedAt));
  const rows = [
    ["Runtime", escape(health.runtime)],
    ["Server time", timeCell(health.time)],
    ["Last cold start", timeCell(health.bootedAt)],
    ["Geo city database", health.geo.city ? "loaded" : "not loaded"],
    ["Geo ASN database", health.geo.asn ? "loaded" : "not loaded"],
    ["Geo load time", `${health.geo.loadMs} ms`],
  ];
  return `<div class="card">
<div class="vitals">
<div><span class="caps">Status</span><b><i class="state"></i>Operational</b></div>
<div><span class="caps">Uptime</span><b class="num">${formatSpan(uptime)}</b></div>
<div><span class="caps">Version</span><b>${escape(version.number)}${version.tag ? ` <span class="tag caps" title="The ${escape(version.tag)} tag: v2 is still being tested and is not the stable release">pre-release</span>` : ""}</b></div>
</div>
<dl class="kv">${rows.map(([label, value]) => `<div><dt class="caps">${label}</dt><dd>${value}</dd></div>`).join("")}</dl>
</div>`;
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
  return `<div class="card chart"><div class="scroll"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Cumulative commits over the last year"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--accent);stop-opacity:.12"/><stop offset="1" style="stop-color:var(--accent);stop-opacity:0"/></linearGradient><linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color:var(--fg);stop-opacity:.5"/><stop offset=".75" style="stop-color:var(--fg)"/><stop offset="1" style="stop-color:var(--accent)"/></linearGradient></defs><g class="rules">${rules}</g><path d="${area}" style="fill:url(#fade)"/><path class="line" d="${line}"/><g>${dots}</g><circle class="halo" cx="${points[final]?.x.toFixed(1) ?? 0}" cy="${y(running).toFixed(1)}" r="9"/><g class="months">${months}</g></svg></div><div class="axis"><span>${history.total} commits in the last year</span><span>${formatDay(history.weeks[0]?.week ?? "")} to ${formatDay(history.weeks.at(-1)?.week ?? "")}</span></div></div>`;
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
<summary><span class="chev"></span><b class="gname">${escape(group.name)}</b><small class="gdesc">${escape(group.description)}</small><span class="mix caps">${escape(methodMix(group))}</span><span class="count num">${group.routes.length}</span></summary>
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
  const spy = [...document.querySelectorAll(".nav a")];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        for (const link of spy) link.setAttribute("aria-current", String(link.hash === "#" + entry.target.id));
      }
    },
    { rootMargin: "-40% 0px -55% 0px" },
  );
  for (const link of spy) observer.observe(document.querySelector(link.hash));
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
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(favicon)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap">
<style>${styles}</style>
</head>
<body>
<header class="top dots"><div class="in">
<a class="brand" href="/" aria-label="Spoar API home">${mark}<span>spoar</span></a>
<span class="context caps"><span class="live"></span><span class="host">${escape(host)}</span></span>
<span class="spacer"></span>
<nav class="nav caps" aria-label="Sections"><a href="#health">Health</a><a href="#history">History</a><a href="#endpoints">Endpoints</a></nav>
<a class="ghost caps wide" href="${escape(view.links.source)}">GitHub</a>
<a class="primary caps" href="${escape(view.links.docs)}">Reference<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>
</div></header>

<main>
<section id="health">
<div class="head"><h2 class="caps">Health</h2><a class="meta link caps" href="${escape(view.links.health)}">/v2/health</a></div>
${healthBlock(view.health)}
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

<footer class="dots"><div class="in"><span>${escape(view.name)} v${escape(splitVersion(view.health.version).number)} · by <a class="link" href="${escape(view.links.author)}">@remcostoeten</a></span><span><a class="link" href="${escape(view.links.docs)}">Reference</a> · <a class="link" href="${escape(view.links.source)}">Source</a></span></div></footer>
<script>${script}</script>
</body>
</html>
`;
}
