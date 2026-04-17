import { Hono } from "hono";
import { cors } from "hono/cors";
import { handleIngest } from "./handlers/ingest.js";
import { handleMetrics } from "./handlers/metrics.js";
import { handleAdminCleanup, handleAdminStats } from "./handlers/admin.js";

const app = new Hono();

function getCorsOrigin(origin: string | undefined): string | undefined {
  return origin;
}

app.use(
  "*",
  cors({
    origin: getCorsOrigin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Requested-With"],
    credentials: true,
  }),
);

app.get("/", (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>remco-analytics-ingestion</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      line-height: 1.6;
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; color: #fff; }
    .version { color: #666; font-size: 0.875rem; margin-bottom: 2rem; }
    .endpoint { border-bottom: 1px solid #222; }
    .endpoint-header {
      display: flex;
      align-items: baseline;
      gap: 1rem;
      padding: 0.75rem 0;
      cursor: pointer;
    }
    .endpoint-header::before {
      content: '›';
      color: #444;
      font-size: 1.25rem;
      line-height: 1;
      transition: transform 0.2s;
      transform: rotate(90deg);
    }
    .endpoint.open .endpoint-header::before { transform: rotate(90deg); }
    .endpoint-header:hover { background: #111; margin: 0 -0.5rem; padding: 0.75rem 0.5rem; }
    .endpoint-details {
      display: none;
      padding: 0 0 0.75rem 4.5rem;
      color: #666;
      font-size: 0.875rem;
    }
    .endpoint.open .endpoint-details { display: block; }
    .method {
      font-family: monospace;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      min-width: 60px;
      text-align: center;
    }
    .method.get { background: #1a3a1a; color: #4ade80; }
    .method.post { background: #1a2a3a; color: #60a5fa; }
    .path { font-family: monospace; color: #fff; }
    .desc { color: #888; margin-left: auto; }
    code { background: #222; padding: 0.125rem 0.375rem; border-radius: 3px; color: #aaa; }
    footer { margin-top: 2rem; color: #444; font-size: 0.75rem; }
    a { color: #666; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>remco-analytics-ingestion</h1>
  <div class="version">v0.0.1</div>
  <div class="endpoint">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="path">/</span>
      <span class="desc">API overview</span>
    </div>
    <div class="endpoint-details">Returns this documentation page.</div>
  </div>
  <div class="endpoint">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="path">/health</span>
      <span class="desc">Health check</span>
    </div>
    <div class="endpoint-details">Returns <code>{"ok": true, "timestamp": "..."}</code>. Use for monitoring.</div>
  </div>
  <div class="endpoint">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="path">/ingest</span>
      <span class="desc">Ingest analytics events</span>
    </div>
    <div class="endpoint-details">Accepts JSON payload with <code>type</code>, <code>url</code>, <code>referrer</code>, <code>ua</code>, <code>screen</code>. Returns <code>{"ok": true}</code>.</div>
  </div>
  <div class="endpoint">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="path">/metrics</span>
      <span class="desc">Get metrics</span>
    </div>
    <div class="endpoint-details">Returns aggregated analytics metrics. Query params: <code>period</code> (24h, 7d, 30d, 90d).</div>
  </div>
  <div class="endpoint">
    <div class="endpoint-header">
      <span class="method get">GET</span>
      <span class="path">/admin/stats</span>
      <span class="desc">Admin statistics</span>
    </div>
    <div class="endpoint-details">Returns database statistics. Requires auth.</div>
  </div>
  <div class="endpoint">
    <div class="endpoint-header">
      <span class="method post">POST</span>
      <span class="path">/admin/cleanup</span>
      <span class="desc">Trigger data cleanup</span>
    </div>
    <div class="endpoint-details">Triggers deduplication and cleanup. Requires auth.</div>
  </div>
  <footer>
    <a href="https://github.com/remcostoeten/analytics">GitHub</a>
    <span> · </span>
    <a href="https://www.npmjs.com/package/@remcostoeten/analytics">npm</a>
    <span> · </span>
    <span>Last updated: <span id="commit-date">loading...</span> (Amsterdam)</span>
    <script>
      document.querySelectorAll('.endpoint-header').forEach(el => {
        el.addEventListener('click', () => el.parentElement.classList.toggle('open'));
      });
      fetch('https://api.github.com/repos/remcostoeten/analytics/commits?per_page=1')
        .then(r => r.json())
        .then(d => {
          const commit = d[0];
          if (commit?.sha) {
            const date = new Date(commit.commit.author.date);
            const amsterdam = date.toLocaleString('en-NL', { timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
            const short = commit.sha.substring(0, 7);
            document.getElementById('commit-date').innerHTML = '<a href="https://github.com/remcostoeten/analytics/commit/' + commit.sha + '" style="color:#666">' + short + '</a> ' + amsterdam;
          }
        })
        .catch(() => { document.getElementById('commit-date').textContent = 'unknown'; });
    </script>
  </footer>
</body>
</html>`;
  return c.html(html);
});

app.get("/health", (c) => c.json({ ok: true, timestamp: new Date().toISOString() }));

app.post("/ingest", handleIngest);

app.get("/metrics", handleMetrics);

app.get("/admin/stats", handleAdminStats);
app.post("/admin/cleanup", handleAdminCleanup);

export default app;
export { app };
