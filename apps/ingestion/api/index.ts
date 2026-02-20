import type { IncomingMessage, ServerResponse } from 'http'
import { app } from '../src/app.js'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const chunks: Buffer[] = []
    for await (const chunk of req) {
      chunks.push(Buffer.from(chunk))
    }
    const body = Buffer.concat(chunks).toString()

    const host = req.headers.host ?? 'localhost'
    const url = `https://${host}${req.url}`

    const fetchReq = new Request(url, {
      method: req.method,
      headers: req.headers as Record<string, string>,
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
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ ok: false, error: error.message }))
  }
}
