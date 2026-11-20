import type { ProjectAdmin } from "@spoar/engine";

import { remember } from "../cache/remember";

/**
 * @name cachedProjects
 * @description A `ProjectAdmin` that remembers `find` and `list` answers per instance for
 * `ttlMs`, so the access check on every project route does not ask the database for the project
 * each time. A change through this store clears what it remembers at once; a change made on
 * another instance, or by ingest stamping key usage, applies when the entry expires. Failed reads
 * are never remembered.
 *
 * @example
 * const projects = cachedProjects(stores.projects, () => clock.now(), 60_000);
 */
export function cachedProjects(
  projects: ProjectAdmin,
  clock: () => Date,
  ttlMs: number,
): ProjectAdmin {
  const found = remember<Awaited<ReturnType<ProjectAdmin["find"]>>>(clock, ttlMs);
  const listed = remember<Awaited<ReturnType<ProjectAdmin["list"]>>>(clock, ttlMs);
  function forget() {
    found.clear();
    listed.clear();
  }
  return {
    ...projects,
    find: (id) =>
      found.read(
        id,
        () => projects.find(id),
        (result) => result.ok,
      ),
    list: (visibility) =>
      listed.read(
        visibility ?? "",
        () => projects.list(visibility),
        (result) => result.ok,
      ),
    create: async (project) => {
      forget();
      return projects.create(project);
    },
    update: async (id, patch) => {
      forget();
      return projects.update(id, patch);
    },
    rotate: async (id, kind, value) => {
      forget();
      return projects.rotate(id, kind, value);
    },
    recordKeyCheck: async (id, check) => {
      forget();
      return projects.recordKeyCheck(id, check);
    },
    remove: async (id) => {
      forget();
      return projects.remove(id);
    },
  };
}
