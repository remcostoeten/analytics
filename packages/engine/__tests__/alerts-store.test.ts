import { beforeAll, describe, expect, test } from "bun:test";

import { drizzle } from "drizzle-orm/pglite";

import { drizzleAlerts } from "../src/adapters/drizzle-alerts";
import { drizzleOps } from "../src/adapters/drizzle-ops";
import { runMigrations } from "../src/db/migrate";
import { migrationsDirectory, readMigrations } from "../src/db/migration-files";
import type { QueuedEvent, TargetSpec } from "../src/ports";
import { createClient, createDatabase } from "./pglite-client";

const database = createDatabase();
const db = drizzle(database);
let secrets = 0;
const store = drizzleAlerts(db, () => `whsec_${++secrets}`);
const project = "remcostoeten.nl";
const now = new Date("2026-09-29T12:00:00.000Z");

const mailTarget: TargetSpec = {
  name: "mail",
  channel: "mail",
  on: ["issue.new", "issue.regression"],
  enabled: true,
  settings: { to: ["remco@gmail.com"] },
};
const hookTarget: TargetSpec = {
  name: "ops",
  channel: "webhook",
  on: ["issue.new"],
  enabled: true,
  settings: { url: "https://ops.example.com/hooks/analytics" },
};

function event(id: string, name: "issue.new" | "issue.regression" = "issue.new"): QueuedEvent {
  return {
    subject: id,
    event: {
      name,
      project,
      issue: {
        id,
        title: "TypeError: x is undefined",
        culprit: null,
        level: "error",
        count: 2,
        firstSeen: "2026-09-29T10:00:00.000Z",
        lastSeen: "2026-09-29T11:00:00.000Z",
        lastRelease: null,
        url: `https://api.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/${id}`,
      },
    },
  };
}

beforeAll(async () => {
  const report = await runMigrations(createClient(database), readMigrations(migrationsDirectory), {
    dryRun: false,
    baseline: null,
  });
  if (!report.ok) throw new Error(report.error.message);
  await database.query(
    `INSERT INTO projects (id, name, domain, public_key, secret_key_hash, allowed_origins)
      VALUES ($1, $1, $1, 'pk_test', 'hash', '{}')`,
    [project],
  );
});

describe("drizzleAlerts", () => {
  test("sync creates targets with a secret for each new webhook, and is idempotent", async () => {
    const first = await store.syncTargets(project, [mailTarget, hookTarget]);
    expect(first).toEqual({
      ok: true,
      value: { created: ["mail", "ops"], updated: [], removed: [], secrets: { ops: "whsec_1" } },
    });
    const again = await store.syncTargets(project, [mailTarget, hookTarget]);
    expect(again).toEqual({
      ok: true,
      value: { created: [], updated: [], removed: [], secrets: {} },
    });
    const listed = await store.targets(project);
    expect(
      listed.ok ? listed.value.map((target) => [target.name, target.channel, target.secret]) : null,
    ).toEqual([
      ["mail", "mail", null],
      ["ops", "webhook", "whsec_1"],
    ]);
  });

  test("queue adds one delivery per subscribed target and never twice", async () => {
    const queued = await store.queue(
      [event("iss_1"), event("iss_2", "issue.regression")],
      ["mail", "webhook"],
      now,
    );
    expect(queued).toEqual({ ok: true, value: { queued: 3 } });
    const repeated = await store.queue([event("iss_1")], ["mail", "webhook"], now);
    expect(repeated).toEqual({ ok: true, value: { queued: 0 } });
    const mailOnly = await store.queue([event("iss_3")], ["mail"], now);
    expect(mailOnly).toEqual({ ok: true, value: { queued: 1 } });
    expect(await store.pending()).toEqual({ ok: true, value: 4 });
  });

  test("due batches per target, settle records the outcome, and failing names the target", async () => {
    const due = await store.due(now, 100);
    if (!due.ok) throw new Error(due.error.message);
    const byName = Object.fromEntries(
      due.value.map((batch) => [
        batch.target.name,
        batch.deliveries.map((delivery) => delivery.subject),
      ]),
    );
    expect(byName).toEqual({ mail: ["iss_1", "iss_2", "iss_3"], ops: ["iss_1"] });
    const hooks = due.value.find((batch) => batch.target.name === "ops");
    const mails = due.value.find((batch) => batch.target.name === "mail");
    if (!hooks || !mails) throw new Error("missing batch");
    expect(hooks.target.secret).toBe("whsec_1");
    const later = new Date(now.getTime() + 60_000);
    const settled = await store.settle([
      ...mails.deliveries.map((delivery) => ({
        id: delivery.id,
        status: "sent" as const,
        attempts: 1,
        nextAttemptAt: null,
        error: null,
        at: now,
      })),
      ...hooks.deliveries.map((delivery) => ({
        id: delivery.id,
        status: "pending" as const,
        attempts: 1,
        nextAttemptAt: later,
        error: "POST https://ops.example.com/hooks/analytics answered 502",
        at: now,
      })),
    ]);
    expect(settled).toEqual({ ok: true, value: null });
    expect(await store.due(now, 100)).toEqual({ ok: true, value: [] });
    const retry = await store.due(later, 100);
    expect(retry.ok ? retry.value.map((batch) => batch.target.name) : null).toEqual(["ops"]);
    expect(await store.failing()).toEqual({
      ok: true,
      value: [
        {
          projectId: project,
          name: "ops",
          channel: "webhook",
          reason: "POST https://ops.example.com/hooks/analytics answered 502",
        },
      ],
    });
    const history = await store.deliveries(project, "sent", { limit: 2, offset: 0 });
    expect(
      history.ok ? [history.value.total, history.value.rows.map((row) => row.subject)] : null,
    ).toEqual([3, ["iss_3", "iss_2"]]);
    expect(history.ok ? history.value.rows[0]?.sentAt : null).toEqual(now);
  });

  test("saveTarget, rotateSecret and removeTarget change one target", async () => {
    const saved = await store.saveTarget(project, { ...hookTarget, enabled: false });
    expect(saved).toEqual({
      ok: true,
      value: { created: [], updated: ["ops"], removed: [], secrets: {} },
    });
    expect(await store.rotateSecret(project, "ops")).toEqual({ ok: true, value: "whsec_2" });
    expect(await store.rotateSecret(project, "mail")).toEqual({ ok: true, value: null });
    const target = await store.target(project, "ops");
    expect(target.ok ? [target.value?.enabled, target.value?.secret] : null).toEqual([
      false,
      "whsec_2",
    ]);
    expect(await store.removeTarget(project, "ops")).toEqual({ ok: true, value: true });
    expect(await store.removeTarget(project, "ops")).toEqual({ ok: true, value: false });
    const replaced = await store.syncTargets(project, []);
    expect(replaced.ok ? replaced.value.removed : null).toEqual(["mail"]);
  });

  test("cleanup removes old sent and failed deliveries", async () => {
    await store.syncTargets(project, [mailTarget]);
    await store.queue([event("iss_9"), event("iss_10")], ["mail"], now);
    await database.query(
      "UPDATE alert_deliveries SET status = 'sent', created_at = $1::timestamptz - interval '31 days' WHERE subject_id = 'iss_9'",
      [now.toISOString()],
    );
    await database.query(
      "UPDATE alert_deliveries SET status = 'failed', created_at = $1::timestamptz - interval '31 days' WHERE subject_id = 'iss_10'",
      [now.toISOString()],
    );
    const cleaned = await drizzleOps(db).cleanup(now, 1000);
    expect(cleaned.ok ? cleaned.value.rowsDeleted : null).toBe(1);
    const left = await database.query<{ subject_id: string }>(
      "SELECT subject_id FROM alert_deliveries",
    );
    expect(left.rows).toEqual([{ subject_id: "iss_10" }]);
  });
});
