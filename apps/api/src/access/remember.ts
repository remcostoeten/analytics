type Entry<Value> = { value: Value; expires: number };

const maxEntries = 500;

/**
 * @name remember
 * @description A per-instance answer cache that keeps each key's value for `ttlMs`. `read` returns
 * a fresh entry or loads the value, storing it only when `keep` accepts it, so failed reads are
 * never remembered. Past 500 entries the cache starts over, which bounds its memory.
 *
 * @example
 * const projects = remember<Result<Nullable<ProjectAccess>, EngineError>>(() => new Date(), 60_000);
 * await projects.read(key, () => store.byPublicKey(key), (result) => result.ok);
 */
export function remember<Value>(clock: () => Date, ttlMs: number) {
  const entries = new Map<string, Entry<Value>>();
  return {
    clear: () => entries.clear(),
    read: async (key: string, load: () => Promise<Value>, keep: (value: Value) => boolean) => {
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
