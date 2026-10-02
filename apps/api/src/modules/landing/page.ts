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

function host(url: string) {
  return url.replace(/^https?:\/\//, "");
}

const mark = `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true"><path d="M2 19 8 11l5 5 4-9 5 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="19" r="2" fill="currentColor"/></svg>`;

const principles = [
  {
    title: "No visitor cookies",
    body: "Tracked visitors get no cookies. The admin session cookie for the dashboard is the only cookie the API sets.",
  },
  {
    title: "No raw IP addresses",
    body: "Raw IP addresses are never stored. The API keeps a salted hash and reads the address in memory for the geo lookup.",
  },
  {
    title: "Two keys per project",
    body: "Browsers send `X-Project-Key` from an allowed origin. Servers send `Authorization: Bearer sk_...`. Neither one unlocks the other side.",
  },
  {
    title: "Public by choice",
    body: "Public projects can be read without a key. Private projects need a signed-in member or an API token, and answer 404 to everyone else.",
  },
  {
    title: "One error shape",
    body: "Every error uses `{ error: { code, message, requestId, docs } }`, and every response carries `x-request-id`.",
  },
  {
    title: "Budgets, not bans",
    body: "Limited requests answer 429 with `Retry-After`. Ingest, anonymous reads and the SQL console each have their own budget.",
  },
];

const trace = [
  { stage: "accept", note: "1 event, 412 B, origin allowed" },
  { stage: "hash", note: "sha256(ip + daily salt), raw ip dropped" },
  { stage: "geo", note: "Amsterdam, NL, from memory" },
  { stage: "signals", note: "bot score 0.02, human" },
  { stage: "store", note: "events, sessions, 8 ms" },
];

const styles = `
:root {
  color-scheme: dark;
  --bg: #050505;
  --panel: #0c0c0d;
  --raised: #141416;
  --hover: #1a1a1d;
  --line: #1f1f23;
  --line-strong: #2a2a30;
  --text: #f2f2f2;
  --muted: #9b9ba3;
  --faint: #66666e;
  --ghost: #3a3a41;
  --mono: ui-monospace, "SF Mono", "JetBrains Mono", "Cascadia Code", Menlo, Consolas, monospace;
  --sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --serif: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, Georgia, serif;
  --gutter: clamp(16px, 4vw, 48px);
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; scroll-padding-top: 72px; }
body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.6 var(--sans); -webkit-font-smoothing: antialiased; overflow-x: hidden; }
::selection { background: var(--text); color: var(--bg); }
a { color: inherit; text-decoration: none; }
p { margin: 0; }
code, pre, kbd { font-family: var(--mono); }
code { font-size: .86em; color: var(--text); background: var(--raised); border: 1px solid var(--line); border-radius: 4px; padding: 1px 5px; }
kbd { font-size: 11px; color: var(--faint); border: 1px solid var(--line-strong); border-bottom-width: 2px; border-radius: 4px; padding: 0 5px; }
.frame { max-width: 1200px; margin: 0 auto; border-left: 1px solid var(--line); border-right: 1px solid var(--line); }
.row { padding-left: var(--gutter); padding-right: var(--gutter); }

.bar { position: sticky; top: 0; z-index: 10; background: rgba(5,5,5,.78); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-bottom: 1px solid var(--line); }
.bar .frame { display: flex; align-items: center; justify-content: space-between; height: 60px; border-top: 0; border-bottom: 0; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 600; letter-spacing: -.02em; font-size: 17px; }
.brand small { font-weight: 400; color: var(--faint); font-family: var(--mono); font-size: 12px; margin-left: 2px; }
.nav { display: flex; gap: 2px; }
.nav a { color: var(--muted); font-size: 14px; padding: 6px 10px; border-radius: 6px; transition: color .15s, background .15s; }
.nav a:hover { color: var(--text); background: var(--raised); }

.hero { display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
.entry { padding: 96px var(--gutter) 72px; border-right: 1px solid var(--line); }
.word { font-family: var(--serif); font-size: clamp(72px, 11vw, 136px); line-height: .9; letter-spacing: -.03em; font-weight: 400; margin: 0 0 20px; color: var(--text); }
.word i { font-style: italic; color: var(--muted); }
.phon { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; font-family: var(--mono); font-size: 13px; color: var(--faint); margin-bottom: 36px; }
.phon .sep { color: var(--ghost); }
.gloss { font-family: var(--serif); font-style: italic; font-size: 20px; color: var(--muted); margin: -24px 0 36px; }
.defs { display: grid; gap: 18px; max-width: 560px; }
.def { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 12px; }
.def b { font-family: var(--mono); font-weight: 500; font-size: 13px; color: var(--faint); padding-top: 4px; }
.def p { font-size: 17px; color: var(--muted); }
.def p strong { color: var(--text); font-weight: 500; }
.def em { font-family: var(--serif); font-style: italic; color: var(--text); font-size: 18px; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 44px; }
.button { display: inline-flex; align-items: center; gap: 8px; height: 42px; padding: 0 18px; border-radius: 999px; font-size: 14px; font-weight: 500; border: 1px solid var(--line-strong); color: var(--text); background: transparent; transition: background .15s, border-color .15s, transform .15s; }
.button:hover { background: var(--raised); border-color: var(--ghost); }
.button:active { transform: translateY(1px); }
.button.primary { background: var(--text); color: var(--bg); border-color: var(--text); }
.button.primary:hover { background: #fff; }
.button svg { transition: transform .15s; }
.button:hover svg { transform: translate(1px, -1px); }

.aside { display: flex; flex-direction: column; }
.status { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 18px var(--gutter); border-bottom: 1px solid var(--line); font-family: var(--mono); font-size: 12px; color: var(--muted); }
.status .live { display: inline-flex; align-items: center; gap: 8px; color: var(--text); }
.pulse { position: relative; width: 7px; height: 7px; border-radius: 50%; background: var(--text); }
.pulse::after { content: ""; position: absolute; inset: 0; border-radius: 50%; background: var(--text); animation: pulse 2.4s cubic-bezier(.2,.6,.4,1) infinite; }
@keyframes pulse { to { transform: scale(3.2); opacity: 0; } }
.trace { flex: 1; padding: 28px var(--gutter) 32px; font-family: var(--mono); font-size: 13px; line-height: 1.7; }
.trace-head { display: flex; justify-content: space-between; gap: 12px; color: var(--muted); padding-bottom: 14px; margin-bottom: 14px; border-bottom: 1px dashed var(--line-strong); }
.trace-head b { color: var(--text); font-weight: 500; }
.trace-head .code { color: var(--text); }
.trace ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.trace li { display: grid; grid-template-columns: 18px 72px minmax(0, 1fr); gap: 10px; align-items: baseline; opacity: 0; animation: reveal .5s ease forwards; }
.trace li:nth-child(1) { animation-delay: .2s; }
.trace li:nth-child(2) { animation-delay: .7s; }
.trace li:nth-child(3) { animation-delay: 1.2s; }
.trace li:nth-child(4) { animation-delay: 1.7s; }
.trace li:nth-child(5) { animation-delay: 2.2s; }
@keyframes reveal { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
.trace .tick { color: var(--ghost); }
.trace .stage { color: var(--text); }
.trace .note { color: var(--faint); overflow-wrap: anywhere; }
.trace-foot { margin-top: 18px; padding-top: 14px; border-top: 1px dashed var(--line-strong); color: var(--faint); display: flex; justify-content: space-between; gap: 12px; opacity: 0; animation: reveal .5s ease 2.8s forwards; }
.trace-foot b { color: var(--text); font-weight: 500; }
.spark { display: block; width: 100%; height: 110px; margin-top: auto; }
.spark path { fill: none; stroke: var(--ghost); stroke-width: 1.5; stroke-dasharray: 1200; stroke-dashoffset: 1200; animation: draw 3s ease-out .4s forwards; }
.spark .fill { fill: url(#fade); stroke: none; opacity: 0; animation: reveal 1.2s ease 2.4s forwards; }
@keyframes draw { to { stroke-dashoffset: 0; } }

.ticker { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
.tick-item { padding: 18px var(--gutter); border-left: 1px solid var(--line); display: flex; flex-direction: column; gap: 2px; }
.tick-item:first-child { border-left: 0; }
.tick-item b { font-size: 22px; font-weight: 600; letter-spacing: -.02em; font-variant-numeric: tabular-nums; line-height: 1.2; overflow-wrap: anywhere; }
.tick-item b.text { font-family: var(--mono); font-size: 14px; font-weight: 500; letter-spacing: 0; padding-top: 6px; }
.tick-item span { font-family: var(--mono); font-size: 11px; color: var(--faint); text-transform: uppercase; letter-spacing: .08em; }

section { border-bottom: 1px solid var(--line); }
.head { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); border-bottom: 1px solid var(--line); }
.head > div { padding: 28px var(--gutter); }
.head > div:first-child { border-right: 1px solid var(--line); }
.kicker { font-family: var(--mono); font-size: 12px; color: var(--faint); text-transform: uppercase; letter-spacing: .12em; }
h2 { margin: 0; font-size: clamp(28px, 4vw, 40px); font-weight: 500; letter-spacing: -.03em; line-height: 1.1; }
.head p.sub { color: var(--muted); font-size: 16px; max-width: 560px; align-self: center; }
.head p.sub a { color: var(--text); text-decoration: underline; text-decoration-color: var(--ghost); text-underline-offset: 3px; }
.head p.sub a:hover { text-decoration-color: var(--text); }
.head .right { display: flex; align-items: center; }

.principles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
.principle { padding: 32px var(--gutter) 36px; border-right: 1px solid var(--line); border-bottom: 1px solid var(--line); display: flex; flex-direction: column; gap: 14px; transition: background .2s; }
.principle:nth-child(3n) { border-right: 0; }
.principle:nth-last-child(-n+3) { border-bottom: 0; }
.principle:hover { background: var(--panel); }
.principle .n { font-family: var(--mono); font-size: 12px; color: var(--faint); }
.principle h3 { margin: 0; font-size: 18px; font-weight: 500; letter-spacing: -.015em; }
.principle p { color: var(--muted); font-size: 14.5px; }

.start { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); }
.start > .copy { padding: 36px var(--gutter); border-right: 1px solid var(--line); display: grid; align-content: start; gap: 18px; }
.start .copy p { color: var(--muted); font-size: 15px; }
.start .copy a { color: var(--text); text-decoration: underline; text-decoration-color: var(--ghost); text-underline-offset: 3px; }
.start .copy a:hover { text-decoration-color: var(--text); }
.tabs { display: flex; flex-direction: column; }
.tabs input { position: absolute; opacity: 0; pointer-events: none; }
.tablist { display: flex; border-bottom: 1px solid var(--line); overflow-x: auto; }
.tablist label { font-family: var(--mono); font-size: 12.5px; color: var(--muted); padding: 16px 20px; cursor: pointer; border-bottom: 1px solid transparent; margin-bottom: -1px; white-space: nowrap; transition: color .15s; }
.tablist label:hover { color: var(--text); }
.panel { display: none; padding: 26px var(--gutter) 30px; }
.panel pre { margin: 0; font-size: 13px; line-height: 1.8; overflow-x: auto; color: var(--muted); }
.panel .c { color: var(--text); }
.panel .d { color: var(--ghost); }
.panel .s { color: #c9c9ce; }
.panel .k { color: var(--muted); }
.panel .cm { color: var(--faint); font-style: italic; }
#t1:checked ~ .tablist label[for=t1], #t2:checked ~ .tablist label[for=t2], #t3:checked ~ .tablist label[for=t3] { color: var(--text); border-bottom-color: var(--text); }
#t1:checked ~ .panel.p1, #t2:checked ~ .panel.p2, #t3:checked ~ .panel.p3 { display: block; }

.routes { display: grid; grid-template-columns: 240px minmax(0, 1fr); }
.side { position: sticky; top: 60px; align-self: start; border-right: 1px solid var(--line); padding: 20px 12px 20px var(--gutter); display: flex; flex-direction: column; gap: 1px; max-height: calc(100vh - 60px); overflow-y: auto; }
.side a { display: flex; justify-content: space-between; gap: 8px; padding: 7px 10px; border-radius: 6px; font-size: 13.5px; color: var(--muted); transition: color .15s, background .15s; }
.side a:hover { color: var(--text); background: var(--raised); }
.side a span { font-family: var(--mono); font-size: 11.5px; color: var(--ghost); }
.list { min-width: 0; }
.search { position: sticky; top: 60px; z-index: 5; display: flex; align-items: center; gap: 12px; height: 56px; padding: 0 var(--gutter); background: rgba(5,5,5,.9); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border-bottom: 1px solid var(--line); color: var(--faint); }
.search input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: var(--text); font: 14px var(--sans); }
.search input::placeholder { color: var(--faint); }
.search input::-webkit-search-cancel-button { -webkit-appearance: none; }
.group-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; padding: 22px var(--gutter) 10px; }
.group-head h3 { margin: 0; font-size: 15px; font-weight: 500; }
.group-head p { color: var(--faint); font-size: 13px; }
.count { color: var(--faint); font-family: var(--mono); font-size: 12px; white-space: nowrap; }
ul { list-style: none; margin: 0; padding: 0; }
li.r { display: grid; grid-template-columns: 70px minmax(0, 1.2fr) minmax(0, 1fr); align-items: baseline; gap: 4px 16px; padding: 9px var(--gutter); border-top: 1px solid var(--line); transition: background .12s; }
li.r:hover { background: var(--panel); }
.group:last-of-type li.r:last-child { border-bottom: 1px solid var(--line); }
.method { justify-self: start; font-family: var(--mono); font-size: 10.5px; font-weight: 600; letter-spacing: .06em; padding: 2px 7px; border-radius: 3px; border: 1px solid var(--line-strong); color: var(--muted); }
.method.get { color: var(--text); }
.method.post { background: var(--text); color: var(--bg); border-color: var(--text); }
.method.put, .method.patch { background: var(--ghost); color: var(--text); border-color: var(--ghost); }
.method.delete { color: var(--muted); border-style: dashed; }
.path { font-family: var(--mono); font-size: 13px; overflow-wrap: anywhere; color: var(--text); }
.prefix { color: var(--ghost); }
.param { color: var(--muted); font-style: italic; }
.summary { color: var(--faint); font-size: 13px; }
.summary code { font-size: 12px; }
.empty { display: none; padding: 48px var(--gutter); color: var(--faint); font-family: var(--mono); font-size: 13px; }

footer .frame { padding: 48px var(--gutter) 56px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 24px; align-items: end; border-bottom: 0; }
.foot-word { font-family: var(--serif); font-size: clamp(56px, 10vw, 120px); line-height: .85; letter-spacing: -.03em; color: var(--line-strong); }
.foot-meta { display: grid; gap: 6px; justify-items: end; text-align: right; font-family: var(--mono); font-size: 12px; color: var(--faint); }
.foot-meta a:hover { color: var(--text); }

@media (max-width: 960px) {
  .hero { grid-template-columns: minmax(0, 1fr); }
  .entry { border-right: 0; border-bottom: 1px solid var(--line); padding-top: 64px; padding-bottom: 56px; }
  .ticker { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .tick-item:nth-child(4) { border-left: 0; }
  .tick-item:nth-child(n+4) { border-top: 1px solid var(--line); }
  .head, .start { grid-template-columns: minmax(0, 1fr); }
  .head > div:first-child, .start > .copy { border-right: 0; border-bottom: 1px solid var(--line); }
  .principles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .principle:nth-child(3n) { border-right: 1px solid var(--line); }
  .principle:nth-child(2n) { border-right: 0; }
  .principle:nth-last-child(-n+3) { border-bottom: 1px solid var(--line); }
  .principle:nth-last-child(-n+2) { border-bottom: 0; }
  .routes { grid-template-columns: minmax(0, 1fr); }
  .side { display: none; }
}
@media (max-width: 600px) {
  .nav a.wide { display: none; }
  .ticker { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tick-item:nth-child(odd) { border-left: 0; }
  .tick-item:nth-child(n+3) { border-top: 1px solid var(--line); }
  .principles { grid-template-columns: minmax(0, 1fr); }
  .principle { border-right: 0 !important; border-bottom: 1px solid var(--line) !important; }
  .principle:last-child { border-bottom: 0 !important; }
  li.r { grid-template-columns: minmax(0, 1fr); gap: 6px; }
  .trace li { grid-template-columns: 18px minmax(0, 1fr); }
  .trace .note { grid-column: 2; }
  footer .frame { grid-template-columns: minmax(0, 1fr); }
  .foot-meta { justify-items: start; text-align: left; }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  .pulse::after { animation: none; }
  .trace li, .trace-foot, .spark .fill { animation: none; opacity: 1; }
  .spark path { animation: none; stroke-dashoffset: 0; }
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
})();
`;

const sparkPath =
  "M0 60 C 30 58, 50 40, 80 42 S 130 55, 160 48 S 210 20, 240 26 S 290 50, 320 38 S 370 10, 400 18 S 450 44, 480 30 S 530 6, 560 12 L 560 72 L 0 72 Z";

function sparkline() {
  const line = sparkPath.replace(/ L 560 72 L 0 72 Z$/, "");
  return `<svg class="spark" viewBox="0 0 560 72" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".08"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path class="fill" d="${sparkPath}"/><path d="${line}"/></svg>`;
}

function traceCard(view: Landing) {
  const items = trace
    .map(
      (step, index) =>
        `<li><span class="tick">${index === trace.length - 1 ? "└" : "├"}</span><span class="stage">${escape(step.stage)}</span><span class="note">${escape(step.note)}</span></li>`,
    )
    .join("");
  return `<div class="trace">
<div class="trace-head"><span><b>POST</b> <span class="code">/v2/events</span></span><span>${escape(host(view.baseUrl))}</span></div>
<ol>${items}</ol>
<div class="trace-foot"><span><b>202</b> accepted</span><span>${escape(view.runtime)}</span></div>
</div>`;
}

function routeItem(route: RouteEntry) {
  const method = route.method === "ALL" ? "ANY" : route.method;
  const summary = route.summary ? inlineCode(route.summary) : "";
  return `<li class="r"><span class="method ${escape(method.toLowerCase())}">${escape(method)}</span><span class="path">${pathMarkup(route.path)}</span><span class="summary">${summary}</span></li>`;
}

function groupBlock(group: RouteGroup) {
  const count = `${group.routes.length} ${group.routes.length === 1 ? "route" : "routes"}`;
  return `<div class="group" id="${slug(group.name)}">
<div class="group-head"><div><h3>${escape(group.name)}</h3><p>${escape(group.description)}</p></div><span class="count">${count}</span></div>
<ul>${group.routes.map(routeItem).join("")}</ul>
</div>`;
}

function startTabs(view: Landing) {
  const install = `<span class="d">$</span> <span class="c">npm install @spoar/sdk</span>

<span class="cm">// lib/analytics.ts</span>
<span class="k">import</span> { createAnalytics } <span class="k">from</span> <span class="s">"@spoar/sdk"</span>;
<span class="k">import</span> { errors, speedInsights } <span class="k">from</span> <span class="s">"@spoar/sdk/plugins"</span>;

<span class="k">export const</span> analytics = <span class="c">createAnalytics</span>({
  plugins: [<span class="c">speedInsights</span>(), <span class="c">errors</span>()],
});`;
  const send = `<span class="d">$</span> <span class="c">curl</span> -X POST ${escape(view.baseUrl)}/v2/events \\
  -H <span class="s">"authorization: Bearer sk_..."</span> \\
  -H <span class="s">"content-type: application/json"</span> \\
  -d <span class="s">'{"v":1,"sentAt":"2026-10-02T12:00:00Z",
       "events":[{"name":"signup","props":{"plan":"pro"}}]}'</span>

<span class="d">HTTP/1.1</span> <span class="c">202</span> Accepted
<span class="d">x-request-id:</span> req_6f1c...`;
  const read = `<span class="d">$</span> <span class="c">curl</span> <span class="s">"${escape(view.baseUrl)}/v2/projects/remcostoeten.nl/stats?period=7d"</span>

{
  <span class="k">"visitors"</span>: { <span class="k">"value"</span>: 1284, <span class="k">"previous"</span>: 1130 },
  <span class="k">"pageviews"</span>: { <span class="k">"value"</span>: 4917, <span class="k">"previous"</span>: 4502 },
  <span class="k">"bounceRate"</span>: { <span class="k">"value"</span>: 0.41, <span class="k">"previous"</span>: 0.44 },
  <span class="d">...</span>
}`;
  return `<div class="tabs">
<input type="radio" name="tab" id="t1" checked><input type="radio" name="tab" id="t2"><input type="radio" name="tab" id="t3">
<div class="tablist"><label for="t1">01 install</label><label for="t2">02 send an event</label><label for="t3">03 read the numbers</label></div>
<div class="panel p1"><pre>${install}</pre></div>
<div class="panel p2"><pre>${send}</pre></div>
<div class="panel p3"><pre>${read}</pre></div>
</div>`;
}

/**
 * @name landingPage
 * @description Renders the API landing page as one HTML document: a dictionary entry for the
 * name, an animated ingest trace, the public principles, a tabbed quick start, and every
 * documented route with a client-side filter.
 *
 * @example
 * const html = landingPage(landing({ version, time, runtime, baseUrl, groups }));
 */
export function landingPage(view: Landing): string {
  const total = view.groups.reduce((sum, group) => sum + group.routes.length, 0);
  const ticker: { value: string; label: string; text?: boolean }[] = [
    { value: String(total), label: "routes" },
    { value: String(view.groups.length), label: "groups" },
    { value: "0", label: "cookies" },
    { value: "0", label: "raw IPs" },
    { value: view.version, label: "version", text: true },
    { value: view.runtime, label: "runtime", text: true },
  ];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#050505">
<meta name="description" content="Spoar is a self-hosted, privacy-first web analytics API: ingest, reads, error tracking, speed insights and a read-only SQL console.">
<title>${escape(view.name)}</title>
<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(mark.replace('aria-hidden="true"', 'xmlns="http://www.w3.org/2000/svg" color="#f2f2f2"'))}">
<style>${styles}</style>
</head>
<body>
<header class="bar">
<div class="frame row">
<a class="brand" href="/">${mark}<span>spoar</span><small>api</small></a>
<nav class="nav">
<a href="#routes">Routes</a>
<a class="wide" href="${escape(view.links.guide)}">Guides</a>
<a href="${escape(view.links.docs)}">Reference</a>
<a class="wide" href="${escape(view.links.npm)}">npm</a>
<a class="wide" href="${escape(view.links.source)}">GitHub</a>
</nav>
</div>
</header>

<main class="frame">
<div class="hero">
<div class="entry">
<h1 class="word">spoar<i>.</i></h1>
<div class="phon"><span>/spoːər/</span><span class="sep">·</span><span>noun</span><span class="sep">·</span><span>Frisian</span></div>
<p class="gloss">trace, track; the mark something leaves behind.</p>
<div class="defs">
<div class="def"><b>1.</b><p><em>A trace.</em> The line a visitor leaves across a site: pages, sessions, errors, speed. Kept without cookies and without a raw IP address.</p></div>
<div class="def"><b>2.</b><p><strong>The Spoar API.</strong> Takes events from the browser and server SDK, serves aggregate and visitor-level reads, error tracking, speed insights and a read-only SQL console. Every route lives under <code>/v2</code>.</p></div>
</div>
<div class="actions">
<a class="button primary" href="${escape(view.links.docs)}">API reference <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg></a>
<a class="button" href="${escape(view.links.guide)}">Guides and SDK</a>
<a class="button" href="${escape(view.links.openapi)}">OpenAPI JSON</a>
</div>
</div>
<div class="aside">
<div class="status"><span class="live"><span class="pulse"></span>operational</span><span>v${escape(view.version)}</span></div>
${traceCard(view)}
${sparkline()}
</div>
</div>

<div class="ticker">
${ticker.map((item) => `<div class="tick-item"><b${item.text ? ' class="text"' : ""}>${escape(item.value)}</b><span>${escape(item.label)}</span></div>`).join("")}
</div>

<section>
<div class="head"><div><p class="kicker">Principles</p><h2>What it never does</h2></div><div class="right"><p class="sub">The constraints are the product. Each one is enforced in the API, not in a policy page.</p></div></div>
<div class="principles">
${principles.map((item, index) => `<div class="principle"><span class="n">${String(index + 1).padStart(2, "0")}</span><h3>${escape(item.title)}</h3><p>${inlineCode(item.body)}</p></div>`).join("\n")}
</div>
</section>

<section>
<div class="head"><div><p class="kicker">Quick start</p><h2>Three calls in</h2></div><div class="right"><p class="sub">Install the SDK, send one event with a secret key, read the headline numbers back.</p></div></div>
<div class="start">
<div class="copy">
<p>The SDK is <a href="${escape(view.links.npm)}">@spoar/sdk</a>, for browsers, servers, React and Next. The browser build stays under 5 KB gzipped and batches events on its own.</p>
<p>A project has a public key for browsers, limited to its allowed origins, and a secret key for servers. The <a href="${escape(view.links.guide)}">guides</a> walk through creating one.</p>
<p>Public projects answer reads without any key, which is what the third tab shows.</p>
</div>
${startTabs(view)}
</div>
</section>

<section id="routes">
<div class="head"><div><p class="kicker">Reference</p><h2>Every route</h2></div><div class="right"><p class="sub">${total} documented routes in ${view.groups.length} groups, read from the running API. The <a href="${escape(view.links.docs)}">interactive reference</a> has the schemas.</p></div></div>
<div class="routes">
<nav class="side">${view.groups.map((group) => `<a href="#${slug(group.name)}">${escape(group.name)}<span>${group.routes.length}</span></a>`).join("")}</nav>
<div class="list">
<label class="search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input id="filter" type="search" placeholder="Filter by path, method or summary" autocomplete="off" spellcheck="false"><kbd>/</kbd></label>
${view.groups.map(groupBlock).join("\n")}
<div class="empty">No routes match that filter.</div>
</div>
</div>
</section>
</main>

<footer>
<div class="frame">
<div class="foot-word">spoar</div>
<div class="foot-meta">
<span>${escape(view.name)} v${escape(view.version)} on ${escape(view.runtime)}</span>
<span><a href="${escape(view.links.source)}">Source</a> · <a href="${escape(view.links.npm)}">npm</a> · <a href="${escape(view.links.health)}">Health</a></span>
<span>Rendered <time datetime="${escape(view.time)}">${escape(view.time)}</time></span>
</div>
</div>
</footer>
<script>${script}</script>
</body>
</html>
`;
}
