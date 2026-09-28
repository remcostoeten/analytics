import { maxBodyBytes, maxEventsPerBatch } from "@remcostoeten/analytics-contract";
import type { IngestResult } from "@remcostoeten/analytics-contract";
import type { Engine, EngineError, IngestRequest } from "@remcostoeten/analytics-engine";
import { err, ok } from "@remcostoeten/analytics-shared/result";
import type { Result } from "@remcostoeten/analytics-shared/result";
import type { Nullable } from "@remcostoeten/analytics-shared/semantic";

import type { IngestBody } from "./model";

const bearer = /^Bearer\s+(\S+)$/i;

function secretKey(authorization: Nullable<string>) {
  return authorization ? (bearer.exec(authorization)?.[1] ?? null) : null;
}

function tooLarge(message: string): EngineError {
  return { code: "PAYLOAD_TOO_LARGE", message };
}

/**
 * @name readBody
 * @description Reads a raw ingest body: over 60 KB is `PAYLOAD_TOO_LARGE`, text that is not JSON
 * is `VALIDATION_FAILED`, and anything else is the parsed value for the envelope schema to check.
 *
 * @example
 * readBody('{"v":1}'); // ok({ v: 1 })
 */
export function readBody(text: string): Result<unknown, EngineError> {
  if (new TextEncoder().encode(text).length > maxBodyBytes) {
    return err(tooLarge(`The body is over ${maxBodyBytes / 1024} KB`));
  }
  try {
    return ok(JSON.parse(text));
  } catch {
    return err({ code: "VALIDATION_FAILED", message: "The body is not valid JSON" });
  }
}

/**
 * @name ingestEvents
 * @description The events service: limits a batch to 50 events, reads the public key from
 * `X-Project-Key` or the `key` query parameter (which `sendBeacon` needs, as it cannot set
 * headers) or the secret key from `Authorization: Bearer`, and hands the batch to the engine,
 * which checks each event and answers `{ accepted, duplicates, rejected }`. With `adminSession`,
 * the events and their visitor are stored as internal traffic.
 *
 * @example
 * const result = await ingestEvents(engine, body, request, new Date());
 */
export async function ingestEvents(
  engine: Engine,
  body: IngestBody,
  incoming: Request,
  receivedAt: Date,
  adminSession = false,
): Promise<Result<IngestResult, EngineError>> {
  const { headers } = incoming;
  if (body.events.length > maxEventsPerBatch) {
    return err(tooLarge(`A batch holds at most ${maxEventsPerBatch} events`));
  }
  const request: IngestRequest = {
    credentials: {
      publicKey:
        headers.get("x-project-key") || new URL(incoming.url).searchParams.get("key") || null,
      secretKey: secretKey(headers.get("authorization")),
    },
    receivedAt: receivedAt.toISOString(),
    sentAt: body.sentAt,
    request: { headers, adminSession },
    events: body.events,
  };
  return engine.ingest(request);
}
