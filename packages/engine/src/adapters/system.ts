import type { Clock, Hasher, LogEntry, Logger } from "../ports";
import type { LogFields, LogLevel } from "../ports/logger";

/**
 * @name systemClock
 * @description The real `Clock`.
 *
 * @example
 * createEngine({ ...ports, clock: systemClock() }, registry);
 */
export function systemClock(): Clock {
  return { now: () => new Date() };
}

/**
 * @name webCryptoHasher
 * @description A `Hasher` on the Web Crypto API, available in Bun, Node and edge runtimes.
 *
 * @example
 * await webCryptoHasher().sha256("abc"); // "ba7816bf..."
 */
export function webCryptoHasher(): Hasher {
  return {
    sha256: async (input) => {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join(
        "",
      );
    },
  };
}

/**
 * @name jsonLogger
 * @description A `Logger` that writes one JSON line per entry, with the fields flattened in, so
 * Vercel's log view can filter on them. Base fields such as the request id go on every line.
 *
 * @example
 * const logger = jsonLogger((line) => console.log(line), { requestId: "req_01J8ZB4K2M" });
 */
export function jsonLogger(write: (line: string) => void, base: LogFields): Logger {
  function log(level: LogLevel) {
    return (message: string, fields: LogFields = {}) => {
      const entry: LogEntry = { level, message, fields: { ...base, ...fields } };
      write(JSON.stringify({ level: entry.level, message: entry.message, ...entry.fields }));
    };
  }
  return { debug: log("debug"), info: log("info"), warn: log("warn"), error: log("error") };
}
