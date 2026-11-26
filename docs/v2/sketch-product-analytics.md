# Sketch: autocapture, actions, insights, replay and LLM observability

22 November 2026. The scope and the choices below are settled in decisions 17 and 40 to 45 in [plan.md](plan.md), which win if this sketch disagrees. Details not named there can still change per epic.

The audience is solo developers whose apps get little traffic. That sets three constraints for everything below:

- Every feature is off by default and switched on per project. No feature flags; opt-in settings instead.
- Low volume means most things can be computed at read time. No materialized pipelines until a project actually needs one.
- The core SDK stays under 5 KB. Anything heavy is a separate entry point or package that loads only when used.

Left out on purpose: funnels, A/B statistics, feature flags and data pipelines. At a few hundred visitors a week a funnel or an experiment never reaches a useful sample, and there is nothing to pipe.

## What already exists

Several pieces of "rich product analytics" are already built, so the gap is smaller than the PostHog comparison suggests.

| Piece | Where |
| --- | --- |
| Breakdowns on any prop, trait or group | `breakdown/:dimension` with `prop:<key>`, `trait:<key>`, `group:<type>` |
| Filters on the same | `filter[prop:plan]=pro` and friends |
| Paths and retention | `paths`, `retention` reads |
| Group analytics | `groups()` plugin, `group:<type>` dimension |
| Explicit click and form tracking | `clicks()`, `forms()`, `outboundLinks()` plugins |
| Session trails | `sessions/:session/events` |
| Saved SQL | `saved_queries` (0025) and the SQL console |

## Packaging

One extra package per heavy dependency, not one `sdk-plus` bundle. Replay is browser-only and pulls in rrweb; LLM observability is server-only and wraps provider clients. They share nothing, so bundling them makes every install carry both.

| Feature | Ships as | Why |
| --- | --- | --- |
| Autocapture | `autocapture()` in `@spoar/sdk/plugins` | Small, no dependencies, its own 1.25 KB budget |
| Actions | Server side only | Definitions over stored events; no client code |
| Insights | API and dashboard only | Saved reads over the existing routes |
| Session replay | `@spoar/replay` | rrweb is large; the recorder lazy-loads like `speedInsights` loads `web-vitals` |
| LLM observability | `@spoar/llm` | Server-only wrappers around provider clients and the AI SDK |

`@spoar/replay` is a browser plugin on the existing client, so it reads consent, opt-out and `ignoreSelf` from it, and uploads over its own route. `@spoar/llm` is a server wrapper around `createServerAnalytics` and is not a browser plugin.

```ts
import { createAnalytics } from "@spoar/sdk";
import { autocapture } from "@spoar/sdk/plugins";
import { replay } from "@spoar/replay";

createAnalytics({ ...config, plugins: [autocapture(), replay({ sampleRate: 1 })] });
```

## Autocapture

A plugin that records interactions without `data-spoar-*` attributes.

- **What it records**: by default, clicks on interactive elements (`a`, `button`, `[role=button]`, `input[type=submit]`, `summary`, `label`) and form submits. Input changes, rage clicks and dead clicks are opt-in per kind. One event name, `autocapture`, with `kind` set to `click`, `submit`, `change`, `rage` or `dead`.
- **Props**: `selector` (a short stable CSS path, preferring `id`, `data-testid` and `name` over nth-child), `tag`, `text` (trimmed visible text, at most 64 characters), `href` (path only, query stripped, token-like segments replaced with `:redacted`) and `route`.
- **Never recorded**: input values, anything inside `[data-spoar-ignore]`, password fields, fields with `autocomplete` set to `email`, `tel`, `cc-*` or similar, `contenteditable` regions, and the `text` of anything inside `[data-spoar-mask]`.
- **Rage clicks**, opt-in: three or more clicks within one second inside a 30 px radius send `kind: "rage"`. For a small app this is the most useful signal autocapture gives: a button that does not work.
- **Dead clicks**, opt-in and built last in this epic: a click followed by no DOM mutation, navigation or network request within one second. Needs a `MutationObserver`, so it sits behind an option.
- **Interplay**: an element with `data-spoar-click` keeps sending `click` through the `clicks()` plugin, and autocapture skips it so nothing counts twice.
- **Budget**: under 1.25 KB.

Storage is the existing `events` table. The `(project_id, name, ts)` index already covers it.

## Actions

Named definitions over stored events, made after the fact. They are what turns autocapture into something readable: "Clicked upgrade" instead of `button.cta > span`.

```ts
type ActionMatcher =
  | { event: string; props?: { [key: string]: PropValue } }
  | { autocapture: { selector?: string; text?: string; href?: string } }
  | { pageview: { path: string } };

type Action = Entity & {
  projectId: ProjectID;
  name: string;
  matchers: ActionMatcher[];
};
```

- **Matching**: any matcher hits. Prop values compare by JSON type, so `1` does not match `"1"`. `path`, `href` and `text` accept a glob, `selector` matches exactly or as a suffix. Matchers compile to a SQL `WHERE` clause at read time; at this traffic there is no reason to materialize.
- **Reads**: `action` becomes a dimension and a filter, so `filter[action]=upgrade-click`, `breakdown/action` and `timeseries?filter[action]=...` work with no new routes.
- **Routes**: `GET`, `POST`, `PATCH` and `DELETE` on `/v2/projects/:project/actions`, plus `actions` in the admin SDK.
- **Dashboard**: "Create action from this" on any autocapture row in the event log, and later from a click in the replay player.
- **Alerts**: an action can be an alert trigger ("first signup today"). Fits the existing alerts queue.
- **Storage**: one `actions` table with `matchers jsonb`.

## Insights

The query engine is already there. What is missing is a way to build a read in the dashboard, save it and put several on a board.

- **An insight is a saved read**: `kind` (`trend`, `breakdown`, `paths`, `retention`, `stickiness`, `lifecycle` or `sql`), the same query parameters the REST route takes stored as JSON, a chart type and a name. Running an insight calls the route it names, so access rules and caching come for free. An insight of kind `sql` cannot go on a public board, because anonymous viewers have no SQL access.
- **Boards**: an ordered list of insights with sizes. A project can mark a board as its public dashboard.
- **Builder**: pick a metric, an event or action, filters and an optional breakdown. Autocomplete needs `GET /v2/projects/:project/events/names` and `GET /v2/projects/:project/props/keys`, which follow the project's read access and list distinct names and keys from the last 30 days.
- **Two existing reads** to reuse:
  - `stickiness`: how many days in a week or month each visitor was active, as a histogram.
  - `lifecycle`: per interval, visitors who are new, returning, resurrected or gone dormant. The `visit_number` and `days_since_previous_visit` dimensions already do most of the work.
- **Saved segments**, already the next item on the plan after Search Console, slot in here: an insight can reference a segment instead of repeating its filters.
- **Storage**: `insights` and `boards` tables. `saved_queries` stays for SQL and an insight of kind `sql` points to one.

## Session replay

The largest build: a new ingest path, object storage and a player.

### Client

`@spoar/replay` lazy-loads the rrweb recorder only when the package is installed, the project switch is on and consent allows it. Installing the package alone never records.

```ts
replay({
  sampleRate: 1,
  minDurationMs: 3000,
  maskAllInputs: true,
  maskAllText: true,
  maskTextSelector: "[data-spoar-mask]",
  blockSelector: "[data-spoar-block]",
});
```

- Inputs and all page text are masked by default, so personal data rendered as text on the page is not recorded. This covers replay recordings only; what `autocapture()` stores is set by its own rules. `maskAllText: false` shows text, with `maskTextSelector` still masking marked elements. While `maskAllText` is on, `data-spoar-unmask` shows a marked subtree, such as navigation. rrweb 2.2 has no unmask selector, so the plugin passes `maskTextSelector: "*"` and a `maskTextFn` that returns the original text inside `[data-spoar-unmask]`. Canvas, video and cross-origin iframes are not recorded.
- Attributes and URLs can carry personal data that text masking does not reach. Before a chunk is compressed, the plugin rewrites the recorded events: page URLs in meta events and every URL-valued attribute (`href`, `src`, `srcset`, `action`, `formaction`, `poster`, `cite`, `data`) lose their query and hash and have token-like path segments replaced, as `autocapture()` does for `href`. While `maskAllText` is on, `title`, `alt`, `placeholder` and `aria-label` values are masked like text, and `value` attributes are always dropped.
- Recording starts after consent and stops on `optOut()`, `reset()` and consent being revoked. These checks run again after rrweb has loaded, so a revocation during the load cancels the start.
- Do Not Track and Global Privacy Control turn recording off, as they do for events.
- Sessions under `minDurationMs` are discarded client-side, which drops most bounces.
- The `ignoreSelf` plugin also turns off recording, so your own visits are not stored.

### Transport

Replay data does not fit the event envelope: one session is tens to hundreds of KB, past the 60 KB beacon limit.

- A separate route, `POST /v2/replay/:session/:seq`, takes gzip chunks compressed in the browser with `CompressionStream`.
- A chunk is flushed every 10 seconds or at 56 KB compressed, whichever comes first, and on `pagehide` with `fetch` and `keepalive`. The size keeps every chunk inside the 64 KB keepalive limit.
- The public key and allowed origins apply as for events, but `Origin` is a browser policy and not authentication, so the route also limits per IP and per session. Chunks for a project without replay on answer 403 so the client stops.
- `seq` makes retries idempotent: the same key overwrites the same object, and the chunk row is an upsert on project, session and `seq`, so a retry never counts twice.

### Storage

Recordings do not go in Postgres. Neon storage would fill up and every replay read would pull large rows through the pool.

- **Chunks** go to object storage at `replays/<project>/<session>/<seq>.json.gz`. The API reaches it through a `ReplayStore` port with two adapters: an R2 binding on the Cloudflare Worker, which needs no credentials, and an S3-compatible adapter for the Vercel build and self-hosting. The bucket must be private, with no public access and no custom public domain; only the API's binding or credentials read it.
- **Metadata** goes in a `replay_sessions` table: project, session, visitor, start, duration, chunk count, bytes, page count, error count, rage click count, first path and device. Totals are derived from a `replay_chunks` row per chunk, and the nightly job reconciles objects that have no row after a failed write.
- **Retention**: no default and no fixed limit. Recordings are deleted only past `retentionDays` on a project with `retentionEnabled` on (decision 46). The cleanup job deletes objects and rows per project, and the bucket has no R2 lifecycle rule. Deleting a project removes its replay objects and rows before its tombstone. The ingest route refuses chunks for a project that has a tombstone, and the nightly reconcile also deletes objects under a deleted project's prefix, so a chunk written during the deletion does not outlive it. The tombstone stays until a sweep that starts at least a day after the deletion finds the prefix empty, so a late write still meets a tombstone.
- **Caps**: a per-project daily byte cap so one runaway page cannot fill the bucket. Past it the route answers 429 and the client stops for that session.
- **Self-hosting**: replay stays off until a bucket is configured: the `REPLAY_BUCKET` binding on the Worker, or `REPLAY_BUCKET` with its S3 endpoint and credentials elsewhere. Without one the replay routes answer 503 and the dashboard hides replay.

### Player

- A replay page in the dashboard plays the chunks with the rrweb replayer. It fetches each chunk from `GET /v2/projects/:project/replays/:session/chunks/:seq`, which streams the object, so access checks stay in one place and no signed URL can leak. The route answers `application/gzip` with `private, no-store` and checks that the session belongs to the project in the path. The replayer is about 87 KB gzipped and loads only on that page.
- The timeline below it shows the session's own events from `sessions/:session/events`: pageviews, autocapture clicks, rage clicks, errors and web vitals. Clicking one seeks to it.
- Entry points: the visitor detail, the session trail, an issue ("3 replays contain this error") and the replay list filtered by `has_errors`, `has_rage_clicks`, page or device.
- Replays are visitor-level data, and stricter than other detail reads: a member whose role may read the project's visitor-level data or a token with read access to the project, and never anonymous, even on a public project with `publicVisitorData` on. The replay routes use their own check instead of the visitor-data one, so `publicVisitorData` never opens them.

### Privacy

Replay is the one feature that weakens the "no cookies, no raw IPs" story, because it records what a visitor saw. The docs should say so plainly, and the privacy page should list what is masked by default. Recording only after consent is the default and cannot be turned off for EU visitors.

## LLM observability

For apps that call language models: what each call cost, how long it took and whether it failed.

### BYOK

The provider key never leaves your app. `@spoar/llm` wraps your own client or AI SDK model in place and sends only telemetry through the existing server SDK. There is no proxy and no gateway, so nothing of ours sits in the request path and we never hold a provider key.

```ts
import { createServerAnalytics } from "@spoar/sdk/server";
import { observeModel } from "@spoar/llm";

const analytics = createServerAnalytics({ project, secret, endpoint });
const model = observeModel(analytics, openai("gpt-5"), { feature: "summarize" });
```

Wrappers for the AI SDK (as middleware), the OpenAI client and the Anthropic client cover most apps. Accepting OpenTelemetry spans from the AI SDK's telemetry option is an alternative that needs no wrapper at all; worth a spike before choosing.

### What a call records

One `llm_generation` event per model call:

- provider, model, `feature` (your label), status and finish reason
- input, output and cached tokens
- latency and time to first token
- tool names called, not their arguments
- `trace` and `parent` ids so agent loops with several calls group under one request
- the visitor and session when the call is forwarded from a request, as the server SDK already does

Cost is computed on the server from a price table we keep in the repo and stored on each call, so a later price change does not rewrite past spend.

### Prompts and responses

`capture: "none"` by default, which records metadata only. `"full"` stores prompts and responses, truncated and run through the same scrubber the `errors` plugin uses. Full captures go to object storage next to replays, not into `events.props`.

### Read-only

The dashboard view is read-only for every role except admin: cost per day per model, cost per feature, p50 and p95 latency, error rate, the most expensive traces and cost per visitor. Read tokens see aggregates; prompt bodies need admin.

### Storage

An `llm_calls` table with typed columns for tokens, latency and cost, so sums and percentiles do not parse JSON. The event still lands in `events` for the timeline and the session trail.

## Order

1. **Autocapture**. Small, and everything after it uses its events.
2. **Actions**. Makes autocapture readable and reuses the read routes.
3. **Insights and boards**. Mostly dashboard work on routes that exist.
4. **LLM observability**. Server-only and reuses the server SDK; the price table is the only new upkeep.
5. **Session replay**. New ingest route, object storage, retention job and player. Worth starting with a spike on chunk sizes and R2 cost per thousand sessions. The rrweb 2.2.2 recorder is about 23 KB gzipped and loads only once recording starts.

## Not in this scope

An "ask your analytics" assistant on your own LLM key is a different feature from observing your app's LLM calls. It is not part of the LLM observability epic and would need its own epic and decision row.
