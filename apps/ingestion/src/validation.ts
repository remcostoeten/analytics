import { z } from "zod";

const nullableString = z
	.string()
	.optional()
	.nullable()
	.transform((v) => v ?? null);

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
	meta: z
		.record(z.unknown())
		.optional()
		.nullable()
		.transform((v) => v ?? null),
});

export type EventPayload = z.infer<typeof eventSchema>;

export function validateEventPayload(data: unknown) {
	return eventSchema.safeParse(data);
}
