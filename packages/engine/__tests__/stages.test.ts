import { describe, expect, test } from "bun:test";

import type { StageContext } from "../src/define";
import { createDraft } from "../src/draft";
import { flagsStage } from "../src/stages/flags";
import { parseEvent } from "../src/stages/parse";
import { batchContext, browserEvents, memoryPorts, settings } from "./batch";

const context: StageContext = {
  ports: memoryPorts(),
  registry: { stages: [], signals: [], enrichers: [], dimensions: [] },
  settings,
};

describe("flagsStage", () => {
  test.each([
    [
      "production site",
      "https://remcostoeten.nl",
      false,
      { localhost: false, preview: false, internal: false },
    ],
    [
      "localhost",
      "http://localhost:3000",
      false,
      { localhost: true, preview: false, internal: true },
    ],
    [
      "preview",
      "https://site-git-main-remco.vercel.app",
      false,
      { localhost: false, preview: true, internal: false },
    ],
    [
      "admin session",
      "https://remcostoeten.nl",
      true,
      { localhost: false, preview: false, internal: true },
    ],
  ])("%s", async (_, origin, adminSession, expected) => {
    const batch = batchContext();
    const [event] = browserEvents();
    if (!event) throw new Error("browser-batch fixture has no events");
    const draft = createDraft(
      { ...batch, request: { headers: new Headers({ origin }), adminSession } },
      event,
      0,
    );
    const result = await flagsStage.run(draft, context);
    expect(result.ok && result.value.flags).toEqual(expected);
  });
});

describe("parseEvent", () => {
  const [valid] = browserEvents();
  const withoutPage = Object.fromEntries(
    Object.entries(valid ?? {}).filter(([key]) => key !== "page"),
  );
  test.each([
    ["a valid event", valid, null],
    [
      "an empty name",
      { ...valid, name: "" },
      "events[3].name: Expected string length greater or equal to 1",
    ],
    ["a bad id", { ...valid, id: "nope" }, "events[3].id: Expected string to match 'uuid' format"],
    ["a missing page", withoutPage, "events[3].page: Expected required property"],
    ["not an object", "pageview", "events[3]: Expected object"],
    [
      "26 props",
      { ...valid, props: Object.fromEntries(Array.from({ length: 26 }, (_, i) => [`p${i}`, i])) },
      "events[3].props: Expected object to have no more than 25 properties",
    ],
    [
      "25 props",
      { ...valid, props: Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`p${i}`, i])) },
      null,
    ],
    [
      "a prop key over 255 characters",
      { ...valid, props: { ["k".repeat(256)]: 1 } },
      `events[3].props.${"k".repeat(256)}: Unexpected property`,
    ],
    [
      "a nested prop value",
      { ...valid, props: { plan: { tier: "pro" } } },
      "events[3].props.plan: Expected union value",
    ],
    [
      "a string prop over 255 characters",
      { ...valid, props: { plan: "p".repeat(256) } },
      "events[3].props.plan: Expected string length less or equal to 255",
    ],
    [
      "a stack over 255 characters on a pageview",
      { ...valid, props: { stack: "s".repeat(256) } },
      "events[3].props.stack: Expected string length less or equal to 255",
    ],
    [
      "a stack up to 2048 characters on an error",
      { ...valid, name: "error", props: { stack: "s".repeat(2048) } },
      null,
    ],
    [
      "a stack over 2048 characters on an error",
      { ...valid, name: "error", props: { stack: "s".repeat(2049) } },
      "events[3].props.stack: Expected union value",
    ],
  ])("%s", (_, raw, message) => {
    const result = parseEvent(raw, 3);
    if (message === null) expect(result.ok).toBe(true);
    else
      expect(!result.ok && result.error).toEqual({
        code: "VALIDATION_FAILED",
        message,
        details: { index: 3 },
      });
  });
});
