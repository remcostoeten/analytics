import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleIngest } from './handlers/ingest.js'
import { handleMetrics } from './handlers/metrics.js'
import { handleAdminCleanup, handleAdminStats } from './handlers/admin.js'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: (origin) => origin || '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Requested-With'],
    credentials: true,
  })
)

app.get('/', (c) => {
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
    .endpoint {
      display: flex;
      align-items: baseline;
      gap: 1rem;
      padding: 0.75rem 0;
      border-bottom: 1px solid #222;
    }
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
    footer { margin-top: 2rem; color: #444; font-size: 0.75rem; }
  </style>
</head>
<body>
  <h1>remco-analytics-ingestion</h1>
  <div class="version">v1.0.0</div>
  <div class="endpoint"><span class="method get">GET</span><span class="path">/</span><span class="desc">API overview</span></div>
  <div class="endpoint"><span class="method get">GET</span><span class="path">/health</span><span class="desc">Health check</span></div>
  <div class="endpoint"><span class="method post">POST</span><span class="path">/ingest</span><span class="desc">Ingest analytics events</span></div>
  <div class="endpoint"><span class="method get">GET</span><span class="path">/metrics</span><span class="desc">Get metrics</span></div>
  <div class="endpoint"><span class="method get">GET</span><span class="path">/admin/stats</span><span class="desc">Admin statistics</span></div>
  <div class="endpoint"><span class="method post">POST</span><span class="path">/admin/cleanup</span><span class="desc">Trigger data cleanup</span></div>
  <footer>${new Date().toISOString()}</footer>
</body>
</html>`
  return c.html(html)
})

app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))

app.post('/ingest', handleIngest)

app.get('/metrics', handleMetrics)

app.get('/admin/stats', handleAdminStats)
app.post('/admin/cleanup', handleAdminCleanup)

export default app
export { app }
