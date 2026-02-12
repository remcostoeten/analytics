import { Hono } from "hono"
import type { Context } from "hono"

type HealthResp = {
  ok: true
}

type IngestResp = {
  ok: true
}

type ErrorResp = {
  ok: false
  error: string
}

type IngestBody = {
  projectId: string
  type: string
}

function jsonOk(): HealthResp {
  return { ok: true }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function parseBody(value: unknown): IngestBody | null {
  if (!isRecord(value)) {
    return null
  }
  const projectId = value.projectId
  const type = value.type
  if (typeof projectId !== "string" || projectId.length === 0) {
    return null
  }
  if (typeof type !== "string" || type.length === 0) {
    return null
  }
  return { projectId, type }
}

function onHealth(c: Context) {
  return c.json(jsonOk())
}

async function onIngest(c: Context) {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    return c.json<ErrorResp>({ ok: false, error: "invalid_json" }, 400)
  }
  const parsed = parseBody(body)
  if (!parsed) {
    return c.json<ErrorResp>({ ok: false, error: "invalid_payload" }, 400)
  }
  return c.json<IngestResp>({ ok: true }, 200)
}

const app = new Hono()

app.get("/health", onHealth)
app.post("/ingest", onIngest)

export { app }
