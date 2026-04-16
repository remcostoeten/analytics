import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'http'
import { app } from './app.js'

function getHeaderValue(value: string | string[] | undefined, fallback = ''): string {
  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.join(', ')
  }

  return fallback
}

function getRequestHeaders(headers: IncomingHttpHeaders): Headers {
  const requestHeaders = new Headers()

  for (const [key, value] of Object.entries(headers)) {
    const headerValue = getHeaderValue(value)

    if (headerValue) {
      requestHeaders.set(key, headerValue)
    }
  }

  return requestHeaders
}

function getRequestUrl(req: IncomingMessage): string {
  const protocol = getHeaderValue(req.headers['x-forwarded-proto'], 'https')
  const host = getHeaderValue(req.headers.host, 'localhost')
  const path = req.url || '/'

  return `${protocol}://${host}${path}`
}

function setCorsHeaders(res: ServerResponse, req: IncomingMessage) {
  const origin = getHeaderValue(req.headers.origin, '*')

  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With')
  res.setHeader('Vary', 'Origin')
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk))
    }
    const body = Buffer.concat(chunks).toString()

    const fetchReq = new Request(getRequestUrl(req), {
      method: req.method,
      headers: getRequestHeaders(req.headers),
      body: req.method !== 'GET' && req.method !== 'HEAD' && body ? body : undefined,
    })

    const response = await app.fetch(fetchReq)

    res.statusCode = response.status
    response.headers.forEach((value: string, key: string) => res.setHeader(key, value))
    const responseBody = await response.text()
    res.end(responseBody)
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    res.statusCode = 500
    setCorsHeaders(res, req)
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: error.message }))
  }
}
