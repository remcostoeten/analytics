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
