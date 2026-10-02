import { describe, expect, test } from "bun:test";

import { err, ok } from "@remcostoeten/analytics-shared/result";

import { defineEnricher, defineSignal, defineStage } from "../src/define";
import type { Registry, Stage } from "../src/define";
import { correctedTimestamp, createDraft } from "../src/draft";
import { engineError } from "../src/errors";
import { createEngine } from "../src/pipeline";
import { botScoreStage } from "../src/stages/bot-score";
import { enrichStage } from "../src/stages/enrich";
import { flagsStage } from "../src/stages/flags";
import { emptyLocation } from "../src/utilities/edge-geo";
import {
  batchContext,
  browserEvents,
  browserRequest,
  memoryPorts,
  settings,
  testKey,
} from "./batch";

function registry(stages: Stage[]): Registry {
  return { stages, signals: [], enrichers: [], dimensions: [] };
}

const passThrough = defineStage({ name: "pass", rescores: false, run: (draft) => ok(draft) });

const rejectSignup = defineStage({
  name: "reject-signup",
  rescores: false,
  run: (draft) =>
    draft.event.name === "signup"
      ? err(engineError("VALIDATION_FAILED", "signup is not allowed here"))
      : ok(draft),
});

const throwing = defineStage({
  name: "boom",
  rescores: false,
  run: () => {
    throw new Error("database exploded");
  },
});

describe("createEngine().ingest", () => {
  test("stores every event that passes all stages", async () => {
    const ports = memoryPorts();
    const result = await createEngine(ports, registry([passThrough]), settings).ingest(
      browserRequest(),
    );
    expect(result).toEqual(ok({ accepted: 2, duplicates: 0, rejected: [] }));
    expect(ports.store.events.size).toBe(2);
  });

  test("reports the same batch again as duplicates", async () => {
    const ports = memoryPorts();
    const engine = createEngine(ports, registry([passThrough]), settings);
    await engine.ingest(browserRequest());
    const again = await engine.ingest(browserRequest());
    expect(again).toEqual(ok({ accepted: 0, duplicates: 2, rejected: [] }));
  });

  test("rejects a failing event by index and skips the stages after it", async () => {
    const ports = memoryPorts();
    const seen: string[] = [];
    const record = defineStage({
      name: "record",
      rescores: false,
      run: (draft) => {
        seen.push(draft.event.name);
        return ok(draft);
      },
    });
    const result = await createEngine(ports, registry([rejectSignup, record]), settings).ingest(
      browserRequest(),
    );
    expect(result).toEqual(
      ok({
        accepted: 1,
        duplicates: 0,
        rejected: [{ index: 1, code: "VALIDATION_FAILED", message: "signup is not allowed here" }],
      }),
    );
    expect(seen).toEqual(["pageview"]);
  });

  test("turns a thrown error into INTERNAL and logs its stack", async () => {
    const ports = memoryPorts();
    const result = await createEngine(ports, registry([throwing]), settings).ingest(
      browserRequest(),
    );
    expect(result.ok && result.value.rejected.map((rejection) => rejection.code)).toEqual([
      "INTERNAL",
      "INTERNAL",
    ]);
    expect(result.ok && result.value.rejected[0]?.message).toBe("Internal error");
    const [entry] = ports.logger.entries;
    expect(entry?.level).toBe("error");
    expect(entry?.fields.stage).toBe("boom");
    expect(String(entry?.fields.stack)).toContain("database exploded");
  });

  test("returns the store's error when storing fails", async () => {
    const ports = {
      ...memoryPorts(),
      store: {
        insertEvents: async () => err(engineError("UNAVAILABLE", "Could not store events")),
        upsertSessions: async () => ok(undefined),
      },
    };
    const result = await createEngine(ports, registry([passThrough]), settings).ingest(
      browserRequest(),
    );
    expect(result).toEqual(err(engineError("UNAVAILABLE", "Could not store events")));
  });

  test("corrects each timestamp for client clock skew", async () => {
    const ports = memoryPorts();
    const batch = browserRequest();
    await createEngine(ports, registry([passThrough]), settings).ingest(batch);
    const stored = [...ports.store.events.values()][0];
    expect(stored?.ts).toBe("2026-09-27T16:39:58.912Z");
    expect(correctedTimestamp(browserEvents()[0]?.ts ?? "", batch.sentAt, batch.receivedAt)).toBe(
      "2026-09-27T16:39:58.912Z",
    );
  });
});

describe("enrich and bot score stages", () => {
  const country = defineEnricher({
    name: "country",
    enrich: () => ({
      geo: { ...emptyLocation, country: "GB" },
    }),
  });
  const override = defineEnricher({
    name: "override",
    enrich: (draft) => ({
      geo: draft.enrichment.geo ? { ...draft.enrichment.geo, city: "London" } : null,
    }),
  });
  const firefox = defineSignal({
    name: "ua_automation",
    weight: 30,
    replayable: true,
    detect: (draft) => draft.enrichment.client.userAgent?.includes("Firefox") ?? false,
  });
  const signup = defineSignal({
    name: "client_no_input",
    weight: 80,
    replayable: true,
    detect: (draft) => draft.event.name === "signup",
  });

  test("merges enrichers in order and caps the bot score at 100", async () => {
    const ports = memoryPorts();
    const engine = createEngine(
      ports,
      {
        stages: [enrichStage, botScoreStage],
        signals: [firefox, signup],
        enrichers: [country, override],
        dimensions: [],
      },
      settings,
    );
    await engine.ingest(browserRequest());
    const [pageview, signupEvent] = [...ports.store.events.values()];
    expect(pageview?.enrichment.geo).toMatchObject({ country: "GB", city: "London" });
    expect(pageview?.bot).toEqual({ score: 30, reasons: ["ua_automation"] });
    expect(signupEvent?.bot).toEqual({ score: 100, reasons: ["ua_automation", "client_no_input"] });
  });

  test("rescore reruns only the stages marked rescores", async () => {
    const ports = memoryPorts();
    const engine = createEngine(
      ports,
      {
        stages: [throwing, botScoreStage],
        signals: [signup],
        enrichers: [],
        dimensions: [],
      },
      settings,
    );
    const drafts = [...memoryPortsDrafts()];
    const results = await engine.rescore(drafts);
    expect(results.map((result) => result.ok && result.value.bot.score)).toEqual([0, 80]);
    expect(ports.logger.entries).toEqual([]);
  });
});

function memoryPortsDrafts() {
  const batch = batchContext();
  return browserEvents().map((event, index) => createDraft(batch, event, index));
}

describe("admitting a batch", () => {
  function engine(ports = memoryPorts()) {
    return createEngine(ports, registry([passThrough]), settings);
  }

  test("rejects an unknown public key", async () => {
    const request = { ...browserRequest(), credentials: { publicKey: "pk_nope", secretKey: null } };
    const result = await engine().ingest(request);
    expect(!result.ok && result.error.code).toBe("UNAUTHORIZED");
  });

  test("rejects an origin the project does not allow", async () => {
    const result = await engine().ingest(browserRequest({ origin: "https://example.com" }));
    expect(result).toEqual(
      err(
        engineError(
          "FORBIDDEN_ORIGIN",
          "Origin https://example.com is not allowed for this project",
        ),
      ),
    );
  });

  test("accepts any origin with the secret key and trusts forwarded details", async () => {
    const ports = memoryPorts();
    const request = {
      ...browserRequest({ origin: "https://proxy.example", "x-visitor-ip": "2.125.160.216" }),
      credentials: { publicKey: null, secretKey: testKey },
    };
    const result = await engine(ports).ingest(request);
    expect(result.ok && result.value.accepted).toBe(2);
    expect([...ports.store.events.values()][0]?.trusted).toBe(true);
  });

  test("rate-limits an untrusted caller per IP hash", async () => {
    const ports = memoryPorts();
    const limited = createEngine(ports, registry([passThrough]), {
      ...settings,
      rateLimit: { limit: 1, windowSeconds: 60 },
    });
    await limited.ingest(browserRequest());
    const result = await limited.ingest(browserRequest());
    expect(result).toEqual(
      err({
        ...engineError("RATE_LIMITED", "Too many requests"),
        details: { retryAfterSeconds: 60 },
      }),
    );
  });
});

describe("parse and dedupe", () => {
  test("rejects an invalid event by index and stores the rest", async () => {
    const ports = memoryPorts();
    const request = browserRequest();
    const [pageview, signup] = browserEvents();
    const result = await createEngine(ports, registry([passThrough]), settings).ingest({
      ...request,
      events: [pageview, { ...signup, name: "" }],
    });
    expect(result).toEqual(
      ok({
        accepted: 1,
        duplicates: 0,
        rejected: [
          {
            index: 1,
            code: "VALIDATION_FAILED",
            message: "events[1].name: Expected string length greater or equal to 1",
          },
        ],
      }),
    );
  });

  test("counts a repeated id inside one batch as a duplicate", async () => {
    const ports = memoryPorts();
    const [pageview] = browserEvents();
    const result = await createEngine(ports, registry([passThrough]), settings).ingest({
      ...browserRequest(),
      events: [pageview, pageview],
    });
    expect(result).toEqual(ok({ accepted: 1, duplicates: 1, rejected: [] }));
  });

  test("keeps a visitor internal once an admin session marks it", async () => {
    const ports = memoryPorts();
    const engine = createEngine(ports, registry([flagsStage]), settings);
    const admin = browserRequest();
    const [pageview, signup] = browserEvents();
    await engine.ingest({
      ...admin,
      request: { ...admin.request, adminSession: true },
      events: [pageview],
    });
    await engine.ingest({ ...browserRequest(), events: [signup] });
    expect([...ports.store.events.values()].map((draft) => draft.flags.internal)).toEqual([
      true,
      true,
    ]);
  });

  test("upserts sessions for new events only and logs a session failure", async () => {
    const ports = memoryPorts();
    const engine = createEngine(ports, registry([passThrough]), settings);
    await engine.ingest(browserRequest());
    await engine.ingest(browserRequest());
    expect([...ports.store.sessions.values()].map((drafts) => drafts.length)).toEqual([2]);

    const failing = memoryPorts();
    const result = await createEngine(
      {
        ...failing,
        store: {
          ...failing.store,
          upsertSessions: async () => err(engineError("UNAVAILABLE", "Could not store sessions")),
        },
      },
      registry([passThrough]),
      settings,
    ).ingest(browserRequest());
    expect(result.ok && result.value.accepted).toBe(2);
    expect(failing.logger.entries.map((entry) => entry.message)).toEqual(["session upsert failed"]);
  });
});
