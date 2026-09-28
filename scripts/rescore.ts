import { SQL } from "bun";

import { defaultSignals } from "@remcostoeten/analytics-engine";
import { rescoreEvents, scoreSessions } from "@remcostoeten/analytics-engine/jobs";
import { drizzle } from "drizzle-orm/bun-sql";

type Options = {
  from: Date;
  to: Date;
  dryRun: boolean;
  includeLegacy: boolean;
};

type Parsed = { ok: true; value: Options } | { ok: false; error: string };

const usage =
  "Usage: DATABASE_URL=postgres://... bun scripts/rescore.ts --from 2026-09-01 [--to 2026-09-28] [--dry-run] [--include-legacy]";

// A calendar date such as 2026-09-28, read as midnight UTC.
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

function day(value: string | undefined): Date | null {
  if (!value || !datePattern.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function valueOf(argv: string[], flag: string) {
  const at = argv.indexOf(flag);
  return at === -1 ? undefined : argv[at + 1];
}

/**
 * @name parseArguments
 * @description Reads the rescore range and flags from the command line. `--from` is required;
 * `--to` defaults to the end of today, both as UTC dates, and the range excludes `--to`.
 *
 * @example
 * parseArguments(["--from", "2026-09-01", "--to", "2026-09-28", "--dry-run"], new Date());
 */
export function parseArguments(argv: string[], now: Date): Parsed {
  const from = day(valueOf(argv, "--from"));
  if (!from) return { ok: false, error: `--from needs a date such as 2026-09-01.\n${usage}` };
  const toValue = valueOf(argv, "--to");
  const today = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const to = toValue ? day(toValue) : new Date(today.getTime() + 86_400_000);
  if (!to) return { ok: false, error: `--to needs a date such as 2026-09-28.\n${usage}` };
  if (to <= from) return { ok: false, error: "--to must be after --from." };
  return {
    ok: true,
    value: {
      from,
      to,
      dryRun: argv.includes("--dry-run"),
      includeLegacy: argv.includes("--include-legacy"),
    },
  };
}

async function main() {
  const url = process.env.DATABASE_URL;
  const parsed = parseArguments(process.argv.slice(2), new Date());
  if (!url || !parsed.ok) {
    console.error(url ? (parsed.ok ? usage : parsed.error) : `DATABASE_URL is not set.\n${usage}`);
    process.exitCode = 1;
    return;
  }
  const options = parsed.value;
  // Unnamed statements, so pooled connections such as Neon's pooler do not collide on names.
  const client = new SQL(url, { prepare: false });
  try {
    const db = drizzle({ client });
    const events = await rescoreEvents(db, defaultSignals, options);
    const sessions = await scoreSessions(db, options, options.dryRun);
    const suffix = options.dryRun ? " (dry run, nothing changed)" : "";
    console.log(`${events.scanned} events scanned, ${events.changed} rescored${suffix}`);
    console.log(
      `session_velocity on ${sessions.velocity} events, ip_fanout on ${sessions.fanout} events${suffix}`,
    );
  } finally {
    await client.close();
  }
}

if (import.meta.main) await main();
