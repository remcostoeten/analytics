type Entry<Value> = { value: Value; expires: number };

const defaultMaxEntries = 500;

export type Remembered<Value> = {
  read: (
    key: string,
    load: () => Promise<Value>,
    keep: (value: Value) => boolean,
  ) => Promise<Value>;
  clear: () => void;
};

/**
 * @name remember
 * @description A per-instance memo of answers by key for `ttlMs` against `clock`. Only answers
 * `keep` accepts are stored, so a failed read is asked again; past `maxEntries` the memo starts
 * over instead of growing.
 *
 * @example
 * const projects = remember<Result<ProjectRecord, EngineError>>(clock, 60_000);
 * await projects.read(id, () => store.find(id), (result) => result.ok);
 */
export function remember<Value>(
  clock: () => Date,
  ttlMs: number,
  maxEntries = defaultMaxEntries,
): Remembered<Value> {
  const entries = new Map<string, Entry<Value>>();
  return {
    clear: () => entries.clear(),
    read: async (key, load, keep) => {
      const now = clock().getTime();
      const hit = entries.get(key);
      if (hit && hit.expires > now) return hit.value;
      const value = await load();
      if (entries.size >= maxEntries) entries.clear();
      if (keep(value)) entries.set(key, { value, expires: now + ttlMs });
      return value;
    },
  };
}
