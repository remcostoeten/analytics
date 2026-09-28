import { describe, expect, test } from "bun:test";

import { err, ok } from "@remcostoeten/analytics-shared/result";

import { defineEnricher, defineSignal, defineStage } from "../src/define";
import type { Registry, Stage } from "../src/define";
import { correctedTimestamp, createDraft } from "../src/draft";
import { engineError } from "../src/errors";
import { createEngine } from "../src/pipeline";
import { botScoreStage } from "../src/stages/bot-score";
import { enrichStage } from "../src/stages/enrich";
import { browserBatch, memoryPorts } from "./batch";

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
    const result = await createEngine(ports, registry([passThrough])).ingest(browserBatch());
    expect(result).toEqual(ok({ accepted: 2, duplicates: 0, rejected: [] }));
    expect(ports.store.events.size).toBe(2);
  });

  test("reports the same batch again as duplicates", async () => {
    const ports = memoryPorts();
    const engine = createEngine(ports, registry([passThrough]));
    await engine.ingest(browserBatch());
    const again = await engine.ingest(browserBatch());
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
    const result = await createEngine(ports, registry([rejectSignup, record])).ingest(
      browserBatch(),
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
    const result = await createEngine(ports, registry([throwing])).ingest(browserBatch());
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
      },
    };
    const result = await createEngine(ports, registry([passThrough])).ingest(browserBatch());
    expect(result).toEqual(err(engineError("UNAVAILABLE", "Could not store events")));
  });

  test("corrects each timestamp for client clock skew", async () => {
    const ports = memoryPorts();
    const batch = browserBatch();
    await createEngine(ports, registry([passThrough])).ingest(batch);
    const stored = [...ports.store.events.values()][0];
    expect(stored?.ts).toBe("2026-09-27T16:39:58.912Z");
    expect(correctedTimestamp(batch.events[0]?.ts ?? "", batch.sentAt, batch.receivedAt)).toBe(
      "2026-09-27T16:39:58.912Z",
    );
  });
});

describe("enrich and bot score stages", () => {
  const country = defineEnricher({
    name: "country",
    enrich: () => ({
      geo: {
        country: "GB",
        region: null,
        city: null,
        postalCode: null,
        timezone: null,
        latitude: null,
        longitude: null,
      },
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
    detect: (draft) => draft.request.userAgent?.includes("Firefox") ?? false,
  });
  const signup = defineSignal({
    name: "client_no_input",
    weight: 80,
    detect: (draft) => draft.event.name === "signup",
  });

  test("merges enrichers in order and caps the bot score at 100", async () => {
    const ports = memoryPorts();
    const engine = createEngine(ports, {
      stages: [enrichStage, botScoreStage],
      signals: [firefox, signup],
      enrichers: [country, override],
      dimensions: [],
    });
    await engine.ingest(browserBatch());
    const [pageview, signupEvent] = [...ports.store.events.values()];
    expect(pageview?.enrichment.geo).toMatchObject({ country: "GB", city: "London" });
    expect(pageview?.bot).toEqual({ score: 30, reasons: ["ua_automation"] });
    expect(signupEvent?.bot).toEqual({ score: 100, reasons: ["ua_automation", "client_no_input"] });
  });

  test("rescore reruns only the stages marked rescores", async () => {
    const ports = memoryPorts();
    const engine = createEngine(ports, {
      stages: [throwing, botScoreStage],
      signals: [signup],
      enrichers: [],
      dimensions: [],
    });
    const drafts = [...memoryPortsDrafts()];
    const results = await engine.rescore(drafts);
    expect(results.map((result) => result.ok && result.value.bot.score)).toEqual([0, 80]);
    expect(ports.logger.entries).toEqual([]);
  });
});

function memoryPortsDrafts() {
  const batch = browserBatch();
  return batch.events.map((event, index) => createDraft(batch, event, index));
}
