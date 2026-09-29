import { describe, expect, test } from "bun:test";

import type { AlertEvent, WebhookBody } from "@remcostoeten/analytics-contract";

import { alertRoute, verifyAlert } from "../src/server/index";
import { withNativeRuntime } from "./native";

withNativeRuntime();

const secret = "whsec_test";
const encoder = new TextEncoder();

function issueEvent(name: AlertEvent["name"], id: string): AlertEvent {
  return {
    name,
    project: "remcostoeten.nl",
    issue: {
      id,
      title: "TypeError: Cannot read properties of undefined (reading 'map')",
      culprit: "app/blog/[slug]/page.tsx",
      level: "error",
      count: 14,
      firstSeen: "2026-09-28T10:00:00.000Z",
      lastSeen: "2026-09-29T10:00:00.000Z",
      lastRelease: "1.4.2",
      url: `https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/${id}`,
    },
  };
}

const body: WebhookBody = {
  v: 1,
  sentAt: "2026-09-29T10:00:00.000Z",
  events: [issueEvent("issue.new", "iss_42"), issueEvent("issue.regression", "iss_17")],
};

async function signBody(text: string, key: string, timestamp: number) {
  const imported = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    imported,
    encoder.encode(`${timestamp}.${text}`),
  );
  const hex = [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0"));
  return `sha256=${hex.join("")}`;
}

async function signed(
  payload: string = JSON.stringify(body),
  key = secret,
  timestamp = Math.floor(Date.now() / 1000),
) {
  return new Request("https://remcostoeten.nl/api/alerts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-analytics-timestamp": String(timestamp),
      "x-analytics-signature": await signBody(payload, key, timestamp),
    },
    body: payload,
  });
}

describe("verifyAlert", () => {
  test("accepts a signed body and reads it", async () => {
    expect(await verifyAlert(await signed(), secret)).toEqual({ ok: true, value: body });
  });

  test("rejects a body signed with another secret", async () => {
    const verified = await verifyAlert(await signed(undefined, "whsec_other"), secret);
    expect(verified).toMatchObject({ ok: false, error: { code: "BAD_SIGNATURE" } });
  });

  test("rejects a body changed after signing", async () => {
    const request = await signed();
    const tampered = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ ...body, events: [] }),
    });
    expect(await verifyAlert(tampered, secret)).toMatchObject({
      ok: false,
      error: { code: "BAD_SIGNATURE" },
    });
  });

  test("rejects a timestamp more than 5 minutes off", async () => {
    const stale = Math.floor(Date.now() / 1000) - 6 * 60;
    const verified = await verifyAlert(await signed(undefined, secret, stale), secret);
    expect(verified).toMatchObject({ ok: false, error: { code: "STALE_TIMESTAMP" } });
  });

  test("leaves out events it does not know", async () => {
    const payload = JSON.stringify({
      ...body,
      events: [...body.events, { name: "traffic.spike" }],
    });
    const verified = await verifyAlert(await signed(payload), secret);
    expect(verified).toEqual({ ok: true, value: body });
  });

  test("rejects a signed body that is not a webhook body", async () => {
    const verified = await verifyAlert(await signed('{"v":2}'), secret);
    expect(verified).toMatchObject({ ok: false, error: { code: "BAD_BODY" } });
  });
});

describe("alertRoute", () => {
  test("runs the handler for each event by name and answers ok", async () => {
    const seen: string[] = [];
    const route = alertRoute({
      secret,
      on: {
        "issue.new": (event) => {
          seen.push(`new ${event.issue.id}`);
        },
        "issue.regression": async (event) => {
          seen.push(`regression ${event.issue.id}`);
        },
      },
    });
    const response = await route(await signed());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(seen).toEqual(["new iss_42", "regression iss_17"]);
  });

  test("acknowledges an event without a handler", async () => {
    const seen: string[] = [];
    const route = alertRoute({
      secret,
      on: { "issue.new": (event) => void seen.push(event.name) },
    });
    const response = await route(await signed());
    expect(response.status).toBe(200);
    expect(seen).toEqual(["issue.new"]);
  });

  test("answers 401 and runs no handler for a bad signature", async () => {
    const seen: string[] = [];
    const route = alertRoute({
      secret,
      on: { "issue.new": (event) => void seen.push(event.name) },
    });
    const response = await route(await signed(undefined, "whsec_other"));
    expect(response.status).toBe(401);
    expect(seen).toEqual([]);
  });

  test("answers 401 for a stale timestamp", async () => {
    const route = alertRoute({ secret, on: {} });
    const stale = Math.floor(Date.now() / 1000) - 10 * 60;
    expect((await route(await signed(undefined, secret, stale))).status).toBe(401);
  });

  test("answers 500 when the secret is empty", async () => {
    const route = alertRoute({ secret: undefined, on: {} });
    expect((await route(await signed())).status).toBe(500);
  });
});
