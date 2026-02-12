import { z } from 'zod'

export const eventSchema = z.object({
  projectId: z.string().min(1),
  type: z.string().min(1).default('pageview'),
  path: z.string().optional().nullable(),
  referrer: z.string().optional().nullable(),
  origin: z.string().optional().nullable(),
  host: z.string().optional().nullable(),
  ua: z.string().optional().nullable(),
  lang: z.string().optional().nullable(),
  visitorId: z.string().optional().nullable(),
  sessionId: z.string().optional().nullable(),
  meta: z.record(z.unknown()).optional().nullable(),
})

export type EventPayload = z.infer<typeof eventSchema>

export function validateEventPayload(data: unknown) {
  return eventSchema.safeParse(data)
}
