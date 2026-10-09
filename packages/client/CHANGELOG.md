# @spoar/client

## 2.0.0-next.2

### Minor Changes

- b5c6add: `projects.remove(id)` deletes a project through the new owner-only `DELETE /v2/projects/:project`, and a project scope gains `liveVisitors({ everyMs, limit, signal })`, an async iterable that reads `realtime/visitors` on an interval until the signal aborts or a call fails.
- f626396: Every scope has `key(route, ...args)`, and `scopeKey` is exported: a serialisable key holding the project, the route, the scope's query sorted by name and the route's arguments, so a cache such as TanStack Query can dedupe and invalidate reads.

## 2.0.0-next.1

### Patch Changes

- 2cd492f: Add `@spoar/client`, the typed read and admin client for the v2 API. `createClient` returns the combined scope over every project; `project(id)` and the names in `projects` are scopes over one project. Scopes chain with `period`, `between`, `traffic`, `human`, `environment`, `where` and `exclude`, and end in one method per read route: `stats`, `timeseries`, `breakdown`, `realtime`, `realtimeEvents`, `liveEvents`, `paths`, `retention`, `lifecycle`, `stickiness`, `heatmap`, `map`, the speed routes, issues, events, visitors, sessions, people, SQL and the CSV and SQL downloads. Metrics, dimensions, filters and project ids are literal types. The `projects`, `tokens`, `alerts`, `annotations`, `sql` and `system` namespaces hold the admin routes.
  
  `@spoar/sdk/admin` now wraps `@spoar/client`. Its read options are typed by the client: `timeseries` takes a `Metric`, `breakdown` takes a `Dimension` and `metrics` as an array instead of a comma-separated string, and `filter` keys are dimensions.
