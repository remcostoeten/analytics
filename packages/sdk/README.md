# packages/sdk

The 2.0 browser SDK, built epic by epic from `docs/v2/sdk-design.md`. E3.1 delivers the core: `createAnalytics<Events>()`, batching, the beacon transport, identity, consent and the `pageviews` plugin. Plugins, the React, server and proxy entries, and the 2.0.0 release follow in E3.2 to E3.4.

The workspace is named `@remcostoeten/analytics-sdk` and marked private for now. `v1/packages/sdk` still owns the name `@remcostoeten/analytics` in the Bun workspaces, and the v1 dashboard installs it from there, so the rename waits for the release epic.

```ts
import { createAnalytics } from "@remcostoeten/analytics-sdk";

type Events = { signup: { plan: "free" | "pro" } };

const analytics = createAnalytics<Events>({ project: "remcostoeten.nl", key: "pk_live_...", endpoint: "/_ra" });
analytics.track("signup", { plan: "pro" });
```

| Command | Does |
| --- | --- |
| `bun run build` | tsdown into `dist/`, ESM with types |
| `bun test` | Unit tests with happy-dom; every sent envelope is checked against the contract's `IngestEnvelope` |
| `bun run size` (repo root) | Fails above the 4.5 KB min+gzip core budget |
