import { describe, expect, test } from 'bun:test'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

function getCorsOrigin(origin: string | undefined): string | undefined {
  return origin
}

const app = new Hono()

app.use(
  '*',
  cors({
    origin: getCorsOrigin,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-Requested-With'],
    credentials: true,
  })
)

app.post('/ingest', function (c) {
  return c.json({ ok: true })
})

describe('cors', function () {
  test('allows credentialed preflight requests', async function () {
    const response = await app.fetch(
      new Request('https://ingestion-beryl.vercel.app/ingest', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://zentjes.vercel.app',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      })
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://zentjes.vercel.app')
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
  })

  test('allows credentialed post requests', async function () {
    const response = await app.fetch(
      new Request('https://ingestion-beryl.vercel.app/ingest', {
        method: 'POST',
        headers: {
          Origin: 'https://zentjes.vercel.app',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: 'zentjes.vercel.app',
          type: 'pageview',
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe('https://zentjes.vercel.app')
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
  })
})
