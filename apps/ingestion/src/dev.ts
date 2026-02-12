import { Hono } from 'hono'
import { serve } from 'bun'
import { handleIngest } from './handlers/ingest'

type TResp = { ok: true }

function jsonOk(): TResp {
  return { ok: true }
}

const app = new Hono()

app.get('/health', (c) => c.json(jsonOk()))
app.post('/ingest', handleIngest)

serve({ fetch: app.fetch, port: 3000 })

console.log('🚀 Ingestion server running on http://localhost:3000')
