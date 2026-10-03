import { and, asc, eq, gt, gte, lt } from "drizzle-orm";

import type { Database } from "../adapters/drizzle";
import { events } from "../db/schema";
import type { Signal } from "../define";
import type { EventDraft } from "../draft";
import { botLabel } from "../signals/verdict";
import { scoreBot } from "../stages/bot-score";
import { deviceClass } from "../utilities/device-class";
import type { Range } from "./session-signals";
import { syncSessionScores } from "./session-signals";

export type RescoreOptions = Range & {
  dryRun: boolean;
  includeLegacy: boolean;
};

export type RescoreReport = {
  scanned: number;
  changed: number;
};

type StoredRow = {
  id: bigint;
  projectId: string;
  fingerprint: string | null;
  name: string | null;
  type: string;
  ts: Date;
  path: string | null;
  visitorId: string | null;
  sessionId: string | null;
  ua: string | null;
  asn: number | null;
  asOrg: string | null;
  botScore: number;
  botReasons: string[];
};

const pageSize = 1000;
const noHeaders = { get: () => null };

function replayDraft(row: StoredRow): EventDraft {
  const ts = row.ts.toISOString();
  return {
    index: 0,
    projectId: row.projectId,
    trusted: false,
    receivedAt: ts,
    ts,
    origin: null,
    host: null,
    event: {
      id: row.fingerprint ?? String(row.id),
      name: row.name ?? row.type,
      ts,
      visitor: row.visitorId ?? "",
      session: row.sessionId ?? "",
      page: { path: row.path ?? "/" },
      props: {},
    },
    request: { headers: noHeaders, adminSession: false },
    enrichment: {
      client: { ip: null, userAgent: row.ua, ipHash: null },
      geo: null,
      network: { asn: row.asn, asOrg: row.asOrg },
      device: null,
      source: null,
    },
    flags: { localhost: false, preview: false, internal: false },
    bot: {
      score: row.botScore,
      reasons: row.botReasons as EventDraft["bot"]["reasons"],
    },
    replay: true,
    issue: null,
  };
}

function sameReasons(left: string[], right: string[]) {
  return left.length === right.length && left.every((reason) => right.includes(reason));
}

async function page(db: Database, options: RescoreOptions, after: bigint) {
  return db
    .select({
      id: events.id,
      projectId: events.projectId,
      fingerprint: events.fingerprint,
      name: events.name,
      type: events.type,
      ts: events.ts,
      path: events.path,
      visitorId: events.visitorId,
      sessionId: events.sessionId,
      ua: events.ua,
      asn: events.asn,
      asOrg: events.asOrg,
      botScore: events.botScore,
      botReasons: events.botReasons,
    })
    .from(events)
    .where(
      and(
        gte(events.ts, options.from),
        lt(events.ts, options.to),
        gt(events.id, after),
        options.includeLegacy ? undefined : gte(events.schemaVersion, 1),
      ),
    )
    .orderBy(asc(events.id))
    .limit(pageSize);
}

/**
 * @name rescoreEvents
 * @description Reruns bot scoring over stored events in a time range after a signal or weight
 * changed. Signals whose inputs are stored (user agent, ASN) run again; the others keep the
 * reasons each event was stored with, at their current weight. Only v2 rows are scored unless
 * `includeLegacy` is set, because v1 rows carry a score without reasons. Changed events get the
 * new score, reasons, `bot_detected` and legacy `device_type`, and their sessions' `bot_score`
 * follows.
 *
 * @example
 * await rescoreEvents(db, defaultSignals, { from, to, dryRun: true, includeLegacy: false });
 */
export async function rescoreEvents(
  db: Database,
  signals: Signal[],
  options: RescoreOptions,
): Promise<RescoreReport> {
  let scanned = 0;
  let changed = 0;
  let after = -1n;
  for (;;) {
    const rows = await page(db, options, after);
    if (rows.length === 0) break;
    for (const row of rows) {
      const verdict = scoreBot(signals, replayDraft(row));
      if (verdict.score === row.botScore && sameReasons(verdict.reasons, row.botReasons)) continue;
      changed += 1;
      if (options.dryRun) continue;
      const bot = botLabel(verdict.score) === "bot";
      await db
        .update(events)
        .set({
          botScore: verdict.score,
          botReasons: verdict.reasons,
          botDetected: bot,
          deviceType: bot ? "bot" : deviceClass(row.ua),
        })
        .where(eq(events.id, row.id));
    }
    scanned += rows.length;
    after = rows.at(-1)?.id ?? after;
  }
  if (!options.dryRun && changed > 0) await syncSessionScores(db, options);
  return { scanned, changed };
}
