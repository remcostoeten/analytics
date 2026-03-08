// apps/ingestion/src/app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleIngest } from './handlers/ingest.js'
import { handleMetrics } from './handlers/metrics.js'
import { handleAdminCleanup, handleAdminStats } from './handlers/admin.js'

const app = new Hono()

// Configure CORS with security considerations
app.use(
  '*',
  cors({
    origin: process.env.CORS_ORIGIN || '*', // Configure per production needs
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Requested-With'],
    credentials: false, // No credentials needed for analytics
  })
)

app.get('/health', (c) => c.json({ ok: true, timestamp: new Date().toISOString() }))

app.post('/ingest', handleIngest)

app.get('/metrics', handleMetrics)

// Admin endpoints for data management
app.get('/admin/stats', handleAdminStats)
app.post('/admin/cleanup', handleAdminCleanup)

export default app
export { app }
