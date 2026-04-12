import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleIngest } from './handlers/ingest.js'
import { handleMetrics } from './handlers/metrics.js'
import { handleAdminCleanup, handleAdminStats } from './handlers/admin.js'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Requested-With'],
    credentials: false,
  })
)

app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))

app.post('/ingest', handleIngest)

app.get('/metrics', handleMetrics)

app.get('/admin/stats', handleAdminStats)
app.post('/admin/cleanup', handleAdminCleanup)

export default app
export { app }
