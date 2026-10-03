import { ok } from "@remcostoeten/analytics-shared/result";

import { batchCode, rateLimitedCode } from "../logs/lines";
import type { LogFilter, LogRecord, LogStore } from "../ports";

function matches(line: LogRecord, filter: LogFilter) {
  return (
    line.project === filter.project &&
    (!filter.level || line.level === filter.level) &&
    (!filter.kind || line.kind === filter.kind) &&
    (!filter.source || line.source === filter.source) &&
    (!filter.visitor || line.visitor === filter.visitor) &&
    (!filter.search || line.message.toLowerCase().includes(filter.search.toLowerCase()))
  );
}

function count(line: LogRecord, key: string) {
  const value = line.data[key];
  return typeof value === "number" ? value : 0;
}

/**
 * @name memoryLogs
 * @description A `LogStore` in an array with increasing ids, for tests. `next` answers at once
 * and never waits; ingest totals read the same lines.
 *
 * @example
 * const logs = memoryLogs();
 * await logs.write([line]);
 * logs.lines.length; // 1
 */
export function memoryLogs(): LogStore & { lines: LogRecord[] } {
  const lines: LogRecord[] = [];
  let sequence = 0;
  return {
    lines,
    write: async (added) => {
      for (const line of added) {
        sequence += 1;
        lines.push({ ...line, id: String(sequence) });
      }
      return ok(null);
    },
    next: async (query) => {
      const found = lines.filter((line) => matches(line, query.filter));
      const after = query.after;
      const page = after
        ? found.filter((line) => Number(line.id) > Number(after)).slice(0, query.limit)
        : found.slice(-query.limit);
      return ok({ lines: page, cursor: page.at(-1)?.id ?? after ?? String(sequence) });
    },
    ingestTotals: async (project, since) => {
      const recent = lines.filter(
        (line) => line.project === project && line.kind === "ingest" && line.ts >= since,
      );
      const batches = recent.filter((line) => line.data.code === batchCode);
      return ok({
        accepted: batches.reduce((total, line) => total + count(line, "accepted"), 0),
        duplicates: batches.reduce((total, line) => total + count(line, "duplicates"), 0),
        rejected: batches.reduce((total, line) => total + count(line, "rejected"), 0),
        rateLimited: recent.filter((line) => line.data.code === rateLimitedCode).length,
      });
    },
  };
}
