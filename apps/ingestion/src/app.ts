// apps/ingestion/src/app.ts
import { Hono } from 'hono'
import { handleIngest } from './handlers/ingest'
import { metrics } from './dedupe'

type TResp = { ok: true }

function jsonOk(): TResp {
  return { ok: true }
}

const app = new Hono()

app.get('/health', (c) => c.json(jsonOk()))

app.post('/ingest', handleIngest)

app.get('/metrics', (c) => {
  const metricsData = metrics.getMetrics()
  return c.json(metricsData)
})

export { app }
