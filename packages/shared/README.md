# @remcostoeten/analytics-shared

Semantic types, `Result` and `noop` for every v2 package. Private: it is never published, and its `exports` point at `src/`, so there is no build step.

| Import | Contains |
| --- | --- |
| `@remcostoeten/analytics-shared/semantic` | `ID`, `Timestamp`, `Day`, `Milliseconds`, `Nullable`, `Entity`, `CreateInput`, `UpdateInput` and the per-entity ids |
| `@remcostoeten/analytics-shared/result` | `Result`, `ok`, `err` |
| `@remcostoeten/analytics-shared/noop` | `noop`, for intentionally swallowed errors |

This package imports nothing else from the repo; `bun run boundaries` checks that.
