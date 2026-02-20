// apps/ingestion/src/app.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { handleIngest } from './ingest.js'
import { metrics } from './dedupe.js'

const app = new Hono()

app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type'],
  })
)

app.get('/health', (c) => c.json({ ok: true }))

app.post('/ingest', handleIngest)

app.get('/metrics', (c) => c.json(metrics.getMetrics()))

export default app
export { app }
