export type Log = {
  warn: (code: string, message: string) => void;
  info: (code: string, message: string, detail?: unknown) => void;
};

/**
 * @name createLog
 * @description Console output with `[ra]` and a code such as `RA_PROPS_LIMITED`, so it is easy to
 * filter. Warnings print once per code; with `debug` off, informational lines stay silent.
 *
 * @example
 * const log = createLog(() => true, console);
 * log.warn("RA_NO_KEY", "The key option is empty");
 */
export function createLog(debug: () => boolean, output: Pick<Console, "warn" | "info">): Log {
  const warned = new Set<string>();
  return {
    warn: (code, message) => {
      if (warned.has(code) && !debug()) return;
      warned.add(code);
      output.warn(`[ra] ${code}: ${message}`);
    },
    info: (code, message, detail) => {
      if (debug())
        output.info(`[ra] ${code}: ${message}`, ...(detail === undefined ? [] : [detail]));
    },
  };
}
