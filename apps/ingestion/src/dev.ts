import { Hono } from "hono"
import { serve } from "bun"

type TResp = { ok: true }

function jsonOk(): TResp {
  return { ok: true }
}

const app = new Hono()

app.get("/health", (c) => c.json(jsonOk()))

serve({ fetch: app.fetch, port: 3000 })
