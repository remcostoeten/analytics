import type { ProjectStore } from "@spoar/engine";
import { ok } from "@spoar/shared/result";
import type { Nullable } from "@spoar/shared/semantic";

import { remember } from "../cache/remember";

type Props = { at: number; origin: Nullable<string> };

const markWindowMs = 60_000;
const maxMarks = 500;

/**
 * @name cachedIngestProjects
 * @description A `ProjectStore` for ingest that remembers which project a public key or secret
 * hash belongs to per instance for `ttlMs`, so a batch does not read `projects` every time; a
 * rotated or revoked key keeps working on an instance until its entry expires. `markUsed` reaches
 * the database at most once a minute per key and instance, or at once when the origin changes,
 * the same rule the database applies. Failed reads and writes are never remembered.
 *
 * @example
 * const projects = cachedIngestProjects(adapters.projects, () => clock.now(), 60_000);
 */
export function cachedIngestProjects(
  projects: ProjectStore,
  clock: () => Date,
  ttlMs: number,
): ProjectStore {
  const publicKeys = remember<Awaited<ReturnType<ProjectStore["byPublicKey"]>>>(clock, ttlMs);
  const secretHashes = remember<Awaited<ReturnType<ProjectStore["bySecretHash"]>>>(clock, ttlMs);
  const marks = new Map<string, Props>();
  return {
    byPublicKey: (key) =>
      publicKeys.read(
        key,
        () => projects.byPublicKey(key),
        (result) => result.ok,
      ),
    bySecretHash: (hash) =>
      secretHashes.read(
        hash,
        () => projects.bySecretHash(hash),
        (result) => result.ok,
      ),
    markUsed: async (id, kind, at, origin) => {
      const key = `${id}\u0000${kind}`;
      const last = marks.get(key);
      if (last && last.origin === origin && at.getTime() - last.at < markWindowMs) {
        return ok(undefined);
      }
      const marked = await projects.markUsed(id, kind, at, origin);
      if (!marked.ok) return marked;
      if (marks.size >= maxMarks) marks.clear();
      marks.set(key, { at: at.getTime(), origin });
      return marked;
    },
  };
}
