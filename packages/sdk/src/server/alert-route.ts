import type { AlertEvent, AlertEventName, WebhookBody } from "@spoar/contract";
import type { Json } from "@spoar/shared/http";
import { err, ok } from "@spoar/shared/result";
import type { Result } from "@spoar/shared/result";

export type AlertEventOf<Name extends AlertEventName> = AlertEvent & { name: Name };

export type AlertHandlers = {
  [Name in AlertEventName]?: (event: AlertEventOf<Name>) => void | Promise<void>;
};

export type AlertRouteOptions = {
  secret: string | undefined;
  on: AlertHandlers;
};

export type AlertVerifyCode = "NO_SECRET" | "BAD_SIGNATURE" | "STALE_TIMESTAMP" | "BAD_BODY";

export type AlertVerifyError = { code: AlertVerifyCode; message: string };

type JsonRecord = { [key: string]: Json };

const toleranceSeconds = 5 * 60;
const encoder = new TextEncoder();
const knownEvents = {
  "issue.new": true,
  "issue.regression": true,
  "speed.drop": true,
} satisfies { [Name in AlertEventName]: true };
// "sha256=" followed by 64 lowercase hex digits, the HMAC-SHA256 of "<timestamp>.<body>".
const signaturePattern = /^sha256=([0-9a-f]{64})$/;

function failure(code: AlertVerifyCode, message: string) {
  return err<AlertVerifyError>({ code, message });
}

function isRecord(value: Json | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isKnownEvent(name: string): name is AlertEventName {
  return Object.hasOwn(knownEvents, name);
}

function hexBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function readEvent(value: Json): AlertEvent | null {
  if (!isRecord(value) || typeof value.name !== "string" || !isKnownEvent(value.name)) return null;
  if (typeof value.project !== "string") return null;
  if (value.name === "speed.drop") {
    if (!isRecord(value.speed) || typeof value.speed.score !== "number") return null;
  } else if (
    !isRecord(value.issue) ||
    typeof value.issue.id !== "string" ||
    typeof value.issue.title !== "string"
  ) {
    return null;
  }
  // The body is signed by the API, which checks every event against the contract first.
  return value as AlertEvent;
}

function readBody(text: string): Result<WebhookBody, AlertVerifyError> {
  let parsed: Json;
  try {
    parsed = JSON.parse(text);
  } catch {
    return failure("BAD_BODY", "the body is not JSON");
  }
  if (!isRecord(parsed) || parsed.v !== 1 || typeof parsed.sentAt !== "string") {
    return failure("BAD_BODY", "the body is not a version 1 webhook body");
  }
  if (!Array.isArray(parsed.events)) return failure("BAD_BODY", "the body has no events");
  const events = parsed.events.flatMap((value) => readEvent(value) ?? []);
  return ok({ v: 1, sentAt: parsed.sentAt, events });
}

/**
 * @name verifyAlert
 * @description Checks a signed alert webhook request and reads its body: `x-analytics-signature`
 * must be `sha256=` and the hex HMAC-SHA256 of `<x-analytics-timestamp>.<body>` with the target's
 * secret, compared in constant time, and the timestamp (Unix seconds) at most 5 minutes from now,
 * so a captured request cannot be replayed. Events this SDK does not know are left out. It reads
 * the request body and never throws.
 *
 * @example
 * const verified = await verifyAlert(request, process.env.RA_WEBHOOK_SECRET);
 * if (!verified.ok) return new Response(verified.error.message, { status: 401 });
 * for (const event of verified.value.events) console.log(event.name, event.issue.title);
 */
export async function verifyAlert(
  request: Request,
  secret: string | undefined,
): Promise<Result<WebhookBody, AlertVerifyError>> {
  if (!secret) return failure("NO_SECRET", "the webhook secret is empty");
  const signature = signaturePattern.exec(request.headers.get("x-analytics-signature") ?? "");
  if (!signature?.[1])
    return failure("BAD_SIGNATURE", "x-analytics-signature is missing or malformed");
  const timestamp = Number(request.headers.get("x-analytics-timestamp"));
  if (!Number.isInteger(timestamp) || timestamp <= 0) {
    return failure("STALE_TIMESTAMP", "x-analytics-timestamp is missing or not Unix seconds");
  }
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) {
    return failure("STALE_TIMESTAMP", "x-analytics-timestamp is more than 5 minutes off");
  }
  let text: string;
  try {
    text = await request.text();
  } catch {
    return failure("BAD_BODY", "the body could not be read");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    hexBytes(signature[1]),
    encoder.encode(`${timestamp}.${text}`),
  );
  if (!valid) return failure("BAD_SIGNATURE", "x-analytics-signature does not match the body");
  return readBody(text);
}

async function dispatch<Name extends AlertEventName>(
  name: Name,
  event: AlertEvent,
  on: AlertHandlers,
) {
  await on[name]?.(event as AlertEventOf<Name>);
}

/**
 * @name alertRoute
 * @description A route handler for alert webhooks: it checks the request with `verifyAlert`,
 * answers `401` without running any handler when the check fails (`500` when `secret` is empty),
 * and otherwise runs the handler in `on` for each event in order and answers `200 { ok: true }`.
 * An event without a handler is acknowledged and ignored. In Next.js it is the whole `route.ts`.
 *
 * @example
 * export const POST = alertRoute({
 *   secret: process.env.RA_WEBHOOK_SECRET,
 *   on: { "issue.new": async (event) => notifyTeam(event.issue.title) },
 * });
 */
export function alertRoute(options: AlertRouteOptions): (request: Request) => Promise<Response> {
  return async (request) => {
    const verified = await verifyAlert(request, options.secret);
    if (!verified.ok) {
      const status = verified.error.code === "NO_SECRET" ? 500 : 401;
      return Response.json({ ok: false, error: verified.error }, { status });
    }
    for (const event of verified.value.events) await dispatch(event.name, event, options.on);
    return Response.json({ ok: true });
  };
}
