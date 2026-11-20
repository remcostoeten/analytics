import type { TokenStore } from "@spoar/engine";
import { ok } from "@spoar/shared/result";
import type { TokenID } from "@spoar/shared/semantic";

const maxEntries = 1000;

/**
 * @name throttledTokens
 * @description A `TokenStore` whose `touch` writes a token's `lastUsedAt` at most once per
 * `intervalMs` per instance, so a script polling with an API token does not update its row on
 * every request. Skipped touches answer ok; `lastUsedAt` is at most `intervalMs` behind.
 *
 * @example
 * const tokens = throttledTokens(stores.tokens, 60_000);
 */
export function throttledTokens(tokens: TokenStore, intervalMs: number): TokenStore {
  const touched = new Map<TokenID, number>();
  return {
    ...tokens,
    touch: async (id, at) => {
      const last = touched.get(id);
      if (last !== undefined && at.getTime() - last < intervalMs) return ok(undefined);
      const result = await tokens.touch(id, at);
      if (!result.ok) return result;
      if (touched.size >= maxEntries) touched.clear();
      touched.set(id, at.getTime());
      return result;
    },
    revoke: async (id) => {
      touched.delete(id);
      return tokens.revoke(id);
    },
  };
}
