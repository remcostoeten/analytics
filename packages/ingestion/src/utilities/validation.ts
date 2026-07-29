import { z } from "zod";

const nullableString = z
	.string()
	.optional()
	.nullable()
	.transform(function (v) {
		return v ?? null;
	});

export const eventSchema = z.object({
	projectId: z.string().min(1),
	type: z.string().min(1).default("pageview"),
	path: nullableString,
	referrer: nullableString,
	origin: nullableString,
	host: nullableString,
	ua: nullableString,
	lang: nullableString,
	visitorId: nullableString,
	sessionId: nullableString,
	eventId: z.string().uuid().optional().nullable().transform(function (v) {
		return v ?? null;
	}),
	ts: nullableString,
	meta: z
		.record(z.unknown())
		.optional()
		.nullable()
		.transform(function (v) {
			return v ?? null;
		}),
});

export type EventPayload = z.infer<typeof eventSchema>;

export function validateEventPayload(data: unknown) {
	return eventSchema.safeParse(data);
}

const MAX_CLOCK_SKEW_MS = 2 * 60 * 1000;
const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Parses a client-supplied event timestamp, rejecting values that are
 * invalid, in the future beyond clock skew, or older than the retention
 * window for offline-queued events. Returns null when the server clock
 * should be used instead.
 */
export function resolveClientTimestamp(ts: string | null | undefined): Date | null {
	if (!ts) return null;
	const parsed = new Date(ts);
	const ms = parsed.getTime();
	if (Number.isNaN(ms)) return null;
	const now = Date.now();
	if (ms > now + MAX_CLOCK_SKEW_MS) return null;
	if (ms < now - MAX_EVENT_AGE_MS) return null;
	return parsed;
}
