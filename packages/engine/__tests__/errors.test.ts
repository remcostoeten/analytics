import { beforeAll, describe, expect, test } from "bun:test";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { drizzleIssues } from "../src/adapters/drizzle-issues";
import { fixedClock, memoryGeo, memoryLogger } from "../src/adapters/memory";
import { pgliteAdapters } from "../src/adapters/pglite";
import { webCryptoHasher } from "../src/adapters/system";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import { defaultEnrichers } from "../src/enrichers";
import { fingerprintParts, normaliseFile, normaliseMessage } from "../src/errors/fingerprint";
import { scrubText } from "../src/errors/scrub";
import { parseStack } from "../src/errors/stack";
import { createEngine } from "../src/pipeline";
import { defaultSignals } from "../src/signals";
import { defaultStages } from "../src/stages";
import { browserEvents, browserRequest, now, project, settings } from "./batch";
import { createClient } from "./pglite-client";
import { browserHeaders } from "./requests";

const chromeStack = `TypeError: Cannot read properties of undefined (reading 'slug')
    at PostCard (https://remcostoeten.nl/_next/static/chunks/app/page-4f2a9c1b8e.js:12:3405)
    at renderWithHooks (https://remcostoeten.nl/_next/static/chunks/node_modules/react-dom-1a2b3c.js:1:5000)
    at https://remcostoeten.nl/_next/static/chunks/main-77aa00bb.js:2:10`;
const chromeNextDeploy = `TypeError: Cannot read properties of undefined (reading 'slug')
    at PostCard (https://remcostoeten.nl/_next/static/chunks/app/page-9e8d7c6b5a.js:14:118)
    at renderWithHooks (https://remcostoeten.nl/_next/static/chunks/node_modules/react-dom-1a2b3c.js:1:5000)`;
const firefoxStack = `PostCard@https://remcostoeten.nl/_next/static/chunks/app/page-4f2a9c1b8e.js:12:3399
renderWithHooks@https://remcostoeten.nl/_next/static/chunks/node_modules/react-dom-1a2b3c.js:1:5000
@https://remcostoeten.nl/_next/static/chunks/main-77aa00bb.js:2:10`;
const safariStack = `PostCard@https://remcostoeten.nl/_next/static/chunks/app/page-4f2a9c1b8e.js:12:3401
renderWithHooks@webkit-masked-url://hidden/:1:5000
global code@https://remcostoeten.nl/app.js:1:1
[native code]`;

const database = new PGlite();
const clock = fixedClock(now);
const engine = createEngine(
  {
    ...pgliteAdapters(database, clock),
    geo: memoryGeo(new Map()),
    hasher: webCryptoHasher(),
    clock,
    logger: memoryLogger(),
  },
  { stages: defaultStages, signals: defaultSignals, enrichers: defaultEnrichers, dimensions: [] },
  settings,
);
const issues = drizzleIssues(drizzle(database));

let counter = 0;

function error(props: { [key: string]: unknown }, visitor?: string) {
  const [template] = browserEvents();
  if (!template) throw new Error("fixture has no events");
  counter += 1;
  return {
    ...template,
    id: `01928c3e-7a4b-7c1d-9f00-${counter.toString(16).padStart(12, "0")}`,
    ...(visitor ? { visitor } : {}),
    name: "error",
    props: { level: "error", ...props },
  };
}

function send(events: ReturnType<typeof error>[]) {
  return engine.ingest({ ...browserRequest(browserHeaders.chrome), events });
}

async function issueRows() {
  const result = await database.query<{
    title: string;
    culprit: string;
    count: number;
    visitors: number;
    status: string;
    is_regression: boolean;
  }>(
    "SELECT title, culprit, count, visitors, status, is_regression FROM issues ORDER BY first_seen, id",
  );
  return result.rows;
}

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
  await database.query(
    "INSERT INTO projects (id, name, domain, allowed_origins, public_key, secret_key_hash) VALUES ($1, $1, $1, $2, $3, $4)",
    [project.id, project.allowedOrigins, project.publicKey, "unused"],
  );
});

describe("stacks from each browser", () => {
  test("Chrome frames, with node_modules marked not in-app", () => {
    expect(parseStack(chromeStack)).toEqual([
      {
        file: "https://remcostoeten.nl/_next/static/chunks/app/page-4f2a9c1b8e.js",
        line: 12,
        column: 3405,
        function: "PostCard",
        inApp: true,
      },
      {
        file: "https://remcostoeten.nl/_next/static/chunks/node_modules/react-dom-1a2b3c.js",
        line: 1,
        column: 5000,
        function: "renderWithHooks",
        inApp: false,
      },
      {
        file: "https://remcostoeten.nl/_next/static/chunks/main-77aa00bb.js",
        line: 2,
        column: 10,
        function: null,
        inApp: true,
      },
    ]);
  });

  test("Firefox and Safari frames, with masked and native frames", () => {
    expect(parseStack(firefoxStack).map((frame) => frame.function)).toEqual([
      "PostCard",
      "renderWithHooks",
      null,
    ]);
    expect(parseStack(safariStack)).toMatchObject([
      { function: "PostCard", inApp: true },
      { function: "renderWithHooks", inApp: false },
      { function: null, file: "https://remcostoeten.nl/app.js", inApp: true },
    ]);
  });

  test("fingerprint parts drop line numbers, content hashes, ids and numbers", () => {
    const parts = fingerprintParts("TypeError", "Item 4521 not found", parseStack(chromeStack));
    expect(parts).toEqual([
      "TypeError",
      "Item <n> not found",
      "/_next/static/chunks/app/page.js PostCard",
    ]);
    expect(fingerprintParts("TypeError", "Item 9 not found", parseStack(chromeNextDeploy))).toEqual(
      parts,
    );
    expect(normaliseMessage("user 0x1f and 3f2504e0-4f89-11d3-9a0c-0305e82c3301 failed")).toBe(
      "user <id> and <id> failed",
    );
    expect(normaliseFile("https://site.test/assets/index.a1b2c3d4.js?v=1#x")).toBe(
      "/assets/index.js",
    );
  });

  test("scrubbing keeps UTM parameters and removes emails, tokens and long numbers", () => {
    expect(
      scrubText(
        "GET /checkout?token=abc&utm_source=hn&id=1 for ada@example.com with key xxxxxxxxxxxxxxxxxxxxxxxx and card 4242424242",
      ),
    ).toBe("GET /checkout?utm_source=hn for [x] with key [x] and card [x]");
  });
});

describe("grouping into issues", () => {
  test("the same bug across deploys is one issue; another message is another", async () => {
    await send([
      error(
        {
          type: "TypeError",
          message: "Cannot read properties of undefined (reading 'slug')",
          stack: chromeStack,
          release: "a1b2c3d",
        },
        "visitor-a",
      ),
      error(
        {
          type: "TypeError",
          message: "Cannot read properties of undefined (reading 'slug')",
          stack: chromeNextDeploy,
          release: "e4f5a6b",
        },
        "visitor-b",
      ),
      error(
        {
          type: "TypeError",
          message: 'can\'t access property "slug", post is undefined',
          stack: firefoxStack,
        },
        "visitor-a",
      ),
    ]);
    expect(await issueRows()).toEqual([
      {
        title: "TypeError: Cannot read properties of undefined (reading 'slug')",
        culprit: "/_next/static/chunks/app/page.js in PostCard",
        count: 2,
        visitors: 2,
        status: "open",
        is_regression: false,
      },
      {
        title: 'TypeError: can\'t access property "slug", post is undefined',
        culprit: "/_next/static/chunks/app/page.js in PostCard",
        count: 1,
        visitors: 1,
        status: "open",
        is_regression: false,
      },
    ]);
    const releases = await database.query<{ first_release: string; last_release: string }>(
      "SELECT first_release, last_release FROM issues ORDER BY first_seen, id LIMIT 1",
    );
    expect(releases.rows).toEqual([{ first_release: "a1b2c3d", last_release: "e4f5a6b" }]);
    const linked = await database.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM events WHERE name = 'error' AND issue_id IS NOT NULL",
    );
    expect(linked.rows).toEqual([{ n: 3 }]);
  });

  test("a retried batch does not count twice, and stored messages are scrubbed", async () => {
    const batch = [
      error({
        type: "RangeError",
        message: "Bad index 123456789 for ada@example.com",
        stack: chromeStack,
      }),
    ];
    await send(batch);
    await send(batch);
    const [row] = (await issueRows()).filter((issue) => issue.title.startsWith("RangeError"));
    expect(row).toMatchObject({ title: "RangeError: Bad index [x] for [x]", count: 1 });
    const stored = await database.query<{ message: string }>(
      "SELECT meta->>'message' AS message FROM events WHERE name = 'error' AND meta->>'type' = 'RangeError'",
    );
    expect(stored.rows).toEqual([{ message: "Bad index [x] for [x]" }]);
  });

  test("a resolved issue reopens as a regression when it happens again", async () => {
    const listed = await issues.list([project.id], null, { limit: 10, offset: 0 });
    const first = listed.ok ? listed.value.rows.find((issue) => issue.count === 2) : undefined;
    if (!first) throw new Error("issue not found");
    const resolved = await issues.setStatus(first, "resolved");
    expect(resolved.ok ? resolved.value.status : null).toBe("resolved");
    await send([
      error({
        type: "TypeError",
        message: "Cannot read properties of undefined (reading 'slug')",
        stack: chromeStack,
      }),
    ]);
    const again = await issues.get([project.id], first.id);
    expect(again.ok ? again.value : null).toMatchObject({
      status: "open",
      isRegression: true,
      count: 3,
      resolvedAt: null,
    });
    const events = await issues.events(first, { limit: 2, offset: 0 });
    expect(events.ok ? events.value.total : null).toBe(3);
  });

  test("past 100 of one issue in a minute, only the count is stored", async () => {
    for (let round = 0; round < 3; round += 1) {
      await send(
        Array.from({ length: 45 }, () =>
          error({ type: "LoopError", message: "tick", stack: chromeStack }),
        ),
      );
    }
    const [row] = (await issueRows()).filter((issue) => issue.title.startsWith("LoopError"));
    expect(row?.count).toBe(135);
    const stored = await database.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM events WHERE meta->>'type' = 'LoopError'",
    );
    expect(stored.rows).toEqual([{ n: 100 }]);
  });
});
