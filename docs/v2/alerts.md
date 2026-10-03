# Alerts

Approved by Remco on Sep 29, 2026 as decision 16 in `plan.md`. Epic E4.7 builds it.

Alerts tell people that something happened in a project: today a new issue or a regression, later a traffic spike or a speed drop. The API is a small core plus plugins, the way [Better Auth](https://better-auth.com/docs/introduction) is: `alerts()` is a plugin, and each way to send one (mail, webhook, Discord) is a channel inside it. Nothing is on unless it is listed. This replaces the single `ALERT_WEBHOOK_URL` from E4.4; nothing of it is deployed, so nothing migrates.

## Goals

- Every feature is opt-in: no plugin listed means no routes, no jobs and no code running for it.
- Nothing to install beyond the one package: every piece is a module of `@spoar/sdk` or of the engine, and the engine sends mail and HTTP with what the runtime already has (`node:tls` and `fetch`), without outside dependencies.
- Every name, option and result autocompletes, and a wrong value is a type error before it is a runtime error.
- The API validates at the boundary and answers with a field path and a plain message.
- Adding an event, a channel or a mail transport is a checklist of small, separate files, never an edit to a switch in the core.
- An agent reading any file can tell from its names what runs, when, and with what.

## Vocabulary

Every type, file and route uses these words and no synonyms.

| Word | Means | Type |
| --- | --- | --- |
| plugin | An opt-in part of the API, listed in the config: `alerts()` now, later email reports | `ServerPlugin` |
| alert event | Something worth telling, with a typed payload: `issue.new`, `issue.regression`, `speed.drop` | `AlertEvent` |
| channel | A way to send alerts, enabled in the config: `mail()`, `webhook()`, `discord()` | `ChannelDriver` |
| target | Where one project's alerts go on one channel: recipients, a URL, and the events it wants | `AlertTarget` |
| transport | How mail leaves the deployment: `smtp(url)` or `resend(key)` | `MailTransport` |
| delivery | One alert event queued for one target, with its attempts and outcome | `AlertDelivery` |
| batch | The due deliveries of one target, sent together as one mail or one request | `DeliveryBatch` |
| retry policy | How often and how long a failed delivery is tried again | `RetryPolicy` |

A channel is what the deployment allows; a target is what a project uses it for.

## Using it

### 1. The deployment: one config file

`apps/api/analytics.config.ts` lists the plugins. Secrets stay in the environment; the config only reads them.

```ts
import { defineConfig } from "@remcostoeten/analytics-engine/config";
import { alerts, discord, mail, resend, smtp, webhook } from "@remcostoeten/analytics-engine/alerts";

export default defineConfig({
  plugins: [
    alerts({
      channels: [
        mail({ transport: smtp(process.env.MAIL_URL), from: "Analytics <remco@gmail.com>" }),
        webhook(),
        discord(),
      ],
    }),
  ],
});
```

- Leave `alerts()` out and there are no alert routes and the alerts job reports that alerts are off.
- Leave `mail()` out and a project that asks for a mail target gets `VALIDATION_FAILED`: "mail is not enabled on this deployment". The same holds for every channel.
- `transport` takes `smtp(url)` or `resend(key)`. Swapping providers is one line.
- An empty or malformed `MAIL_URL` never stops the API, since ingest must not depend on alerts: mail targets turn `paused` with the problem as the reason, and `GET /v2/admin/alerts/status` shows it.

### 2. Mail transports

| Provider | Config | Cost |
| --- | --- | --- |
| Gmail | `smtp("smtps://you%40gmail.com:<app password>@smtp.gmail.com:465")` | free, about 500 a day |
| Any mailbox | `smtp("smtps://<user>:<password>@<host>:465")` or `smtp://...:587` | depends |
| Amazon SES, Brevo | `smtp(...)` with their SMTP host and credentials | per message, or a free tier |
| Resend | `resend(process.env.RESEND_API_KEY)` | free tier, needs a verified domain |

- `smtp()` is our own client on `node:tls`, which Bun and Node both implement: it logs in, encrypts (TLS from the start on 465, `STARTTLS` on 587, and it refuses to send unencrypted), sends and quits. About 150 lines behind the `Mailer` port, tested against a scripted fake server.
- `resend()` is one `fetch` call to Resend's HTTP API.
- Gmail has an HTTP API too, but it needs Google OAuth; its SMTP server with an app password is the simple and free route.
- `@` and `:` inside a user or password are written as `%40` and `%3A`.

### 3. Retries

Every channel retries a failed delivery, since a webhook or Discord can be down as well as a mail server. The default is written out here; the config only needs what differs.

```ts
alerts({
  channels: [mail({ transport, from }), webhook({ retry: { maxAge: "1h" } })],
  retry: { attempts: 5, backoff: "exponential", maxAge: "24h" },
});
```

| Option | Default | Means |
| --- | --- | --- |
| `attempts` | `5` | Tries after the first failure; `0` turns retrying off |
| `backoff` | `"exponential"` | `"exponential"` waits 1, 5, 30, 120 and 720 minutes; `"fixed"` retries on every job run (10 minutes) |
| `maxAge` | `"24h"` | An alert older than this is not tried again and turns `failed`; a `Duration` like `"30m"`, `"6h"`, `"2d"` |

A channel's own `retry` overrides the plugin's, key by key. The docs recommend a short `maxAge` for chat channels, where a late alert is noise, and more `attempts` for a webhook that feeds another system.

### 4. A project's targets: `sync`

The admin client is a module of the SDK package, `@spoar/sdk/admin`, for server code and scripts. `sync` takes the whole list for a project and makes the stored targets match it: it adds what is missing, updates what changed and removes what is not listed, so running it twice changes nothing.

```ts
import { createAdmin, discord, mail, webhook } from "@spoar/sdk/admin";

type Projects = "remcostoeten.nl" | "skriuw";

const admin = createAdmin<Projects>({
  endpoint: "https://api.analytics.remcostoeten.nl",
  token: process.env.RA_ADMIN_TOKEN,
});

function isHttps(url: string | undefined): url is `https://${string}` {
  return url?.startsWith("https://") ?? false;
}

const discordUrl = process.env.DISCORD_WEBHOOK_URL;
if (!isHttps(discordUrl)) throw new Error("Set DISCORD_WEBHOOK_URL to the Discord webhook URL");

const synced = await admin.alerts.sync("remcostoeten.nl", [
  mail({ to: ["remco@gmail.com"] }),
  discord({ url: discordUrl, on: ["issue.regression"] }),
  webhook({ name: "ops", url: "https://ops.example.com/hooks/analytics" }),
]);

if (!synced.ok) console.error(synced.error.code, synced.error.message);
```

- `name` defaults to the channel, so one target per channel needs no name.
- `on` defaults to every issue event; `enabled` to `true`.
- The result is `{ ok: true, value: { created, updated, removed, secrets } }` or `{ ok: false, error }` with a code from the contract's error catalog. Nothing throws. `secrets` holds the signing secret of each new webhook target, shown only here and after `rotate`.
- `list`, `set`, `remove`, `test`, `rotate` and `deliveries` change or read one target; `test` sends a sample alert now and answers with what the provider said, so a wrong app password shows up during setup.
- The same builders `mail`, `webhook` and `discord` exist in the engine (what a deployment allows) and in the admin client (what a project uses), with the same names on purpose: the first enables a channel, the second fills in a target on it.

### 5. The same over HTTP

Every admin method is one route, so `curl`, a dashboard and other languages behave the same:

```bash
curl -X PUT https://api.analytics.remcostoeten.nl/v2/projects/remcostoeten.nl/alerts/targets \
  -H "authorization: Bearer $RA_ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{ "targets": [ { "channel": "mail", "to": ["remco@gmail.com"] } ] }'
```

A wrong field answers `VALIDATION_FAILED` with `details.path`, such as `/targets/0/to/0`.

### 6. Alerts in your own app

A webhook target posts a signed `WebhookBody`. `alertRoute` in `/server` turns it into a route handler with one typed function per event; in Next.js it is the whole `route.ts`:

```ts
import { alertRoute } from "@spoar/sdk/server";

export const POST = alertRoute({
  secret: process.env.RA_WEBHOOK_SECRET,
  on: {
    "issue.new": async (event) => notifyTeam(event.issue.title),
    "issue.regression": async (event) => openTicket(event.issue),
  },
});
```

- It checks `x-analytics-signature` (an HMAC of `<timestamp>.<body>`) and rejects a timestamp more than 5 minutes off, so a captured request cannot be replayed; a bad request gets `401` and none of the handlers run.
- `on` is typed per event, so `event.issue` autocompletes; an event without a handler is acknowledged and ignored.
- `verifyAlert(request, secret)` is the same check without the routing, for other frameworks.
- The admin client also reads: `admin.stats`, `admin.breakdown`, `admin.issues`, `admin.lifecycle` and the other read routes, typed from the contract, for your own dashboard pages and server components.

### 7. What the editor catches

| Mistake | Caught by |
| --- | --- |
| `createAdmin<Projects>` then `sync("remcostoten.nl", ...)` | type error: not in `Projects` |
| `on: ["issue.created"]` | type error: offers `issue.new` and `issue.regression` |
| `mail({ to: [] })` | type error: at least one address |
| `mail({ to: ["remco"] })` | type error: `${string}@${string}.${string}` |
| `webhook({ url: "http://..." })` | type error: `https://` only |
| `retry: { maxAge: "24 hours" }` | type error: a `Duration` such as `"24h"` |
| two targets with the same literal `name` | type error on the list |
| a handler for an unknown event in `alertRoute` | type error |
| a mail target on a deployment without `mail()` | `VALIDATION_FAILED`: "mail is not enabled on this deployment" |

## Syntax: objects, not chains

A chainable form was weighed for the config and for retries:

```ts
export default analytics()
  .use(
    alerts()
      .channel(mail().transport(smtp(process.env.MAIL_URL)).from("Analytics <remco@gmail.com>"))
      .channel(webhook().retry((policy) => policy.maxAge("1h")))
      .retry((policy) => policy.attempts(5).backoff("exponential").maxAge("24h")),
  );
```

The objects win here:

- A config is data. An object shows every setting at once, and an agent or a reviewer reads it without following calls. A chain hides the defaults and raises questions an object cannot: does `.maxAge()` before `.attempts()` matter, and what does calling `.retry()` twice do?
- Objects merge key by key, which is what a channel's `retry` overriding the plugin's needs; chains need a merge rule of their own.
- Chains pay off when each call adds to the type, like Elysia's `.use()` or Zod. Nothing here grows a type; `satisfies` and literal unions give the same autocomplete on an object.
- Objects need no builder functions per option, so there is less code to maintain and nothing to keep in step with the types.

So the shape is functions that take one object, the same as `betterAuth({ plugins })`.

## HTTP helper

`fetch` is used in five places: the Resend transport, the webhook and Discord channels, the admin client and the existing CrUX job. They share the helpers in `packages/shared/src/http/` (built, see `packages/shared/README.md`), which the engine and the SDK both import:

```ts
const sent = await postJson(url, body, { headers, timeoutMs: 10_000 });
if (!sent.ok) return sent;

const read = await getJson(url, { headers });
```

- `request`, `getJson`, `postJson`, `putJson`, `patchJson` and `deleteJson` return `{ ok: true, value: { status, headers, body } }` or `{ ok: false, error }` and never throw. `error.kind` is `url`, `timeout`, `aborted`, `network`, `status`, `parse` or `schema`.
- A `parse` option checks the answer and types the body; without it the body is `Json`.
- They time out after 10 seconds by default and name the URL without its query string in errors.
- They do not retry. Retrying is the delivery queue's job, so a failure is never retried twice over.

## How it works

### Layers

```text
packages/shared     Result, http (request, getJson, postJson, putJson, patchJson, deleteJson)
packages/contract   schemas and types: events, targets, deliveries, routes
      │
packages/engine     config (defineConfig), alerts plugin: queue, dispatch, render, channels,
      │             transports (smtp on node:tls, resend on fetch), ports AlertStore and Mailer
      │
apps/api            analytics.config.ts, routes under /v2/projects/:project/alerts, the alerts job
      │
packages/sdk        /admin (createAdmin, mail, webhook, discord), /server (alertRoute, verifyAlert)
```

The contract is the single source of every shape: the API validates with it, OpenAPI is generated from it, and the SDK imports its types (decision 10: the SDK carries no runtime schemas, so validation happens once, in the API).

### Flow

Both steps run in `POST /v2/admin/jobs/alerts`, which `jobs.yml` already calls every 10 minutes.

1. **Queue.** Producers turn what happened into alert events. For each event, one delivery per enabled target of that project subscribed to it, inserted with `ON CONFLICT DO NOTHING` on `(target_id, event_name, subject_id)`, so a retried run never queues twice. `subject_id` is the issue id for `issue.new`, the issue id with its `regressed_at` for `issue.regression`, so every regression alerts once, and the project with the UTC day for `speed.drop`, so a drop alerts once a day.
2. **Dispatch.** Due deliveries are grouped per target into a batch, and the target's channel sends the batch as one mail or one request. Success marks them `sent`; failure keeps them `pending` with the error and the next attempt from the retry policy, until the policy runs out and they turn `failed`. One failing target never holds back another.

### Speed drops

`speed.drop` is opt-in: a target gets it only when its `on` lists it. Each alerts run compares yesterday's Real Experience Score (UTC day, production, all devices, p75, metrics with at least 20 samples) with the 7 days before it, for every project with a target subscribed to it. It fires when the score fell by 10 points or more to under 90; `alerts({ speedDrop: { points, below, baselineDays } })` changes those numbers. The payload holds both scores, the rating, the metric whose score fell most, the sample count, the window and a link to the speed read.

```json
{
  "name": "speed.drop",
  "project": "remcostoeten.nl",
  "speed": {
    "score": 78,
    "previous": 90,
    "rating": "needs-improvement",
    "worst": "lcp",
    "samples": 1240,
    "from": "2026-09-28T00:00:00.000Z",
    "to": "2026-09-29T00:00:00.000Z",
    "url": "https://api.analytics.remcostoeten.nl/v2/projects/remcostoeten.nl/speed"
  }
}
```

### Contract

`packages/contract/src/alerts.ts`: finite sets are literal unions, and a target is a discriminated union on `channel`.

```ts
export const AlertEventName = oneOf(["issue.new", "issue.regression", "speed.drop"]);
export const ChannelName = oneOf(["mail", "webhook", "discord"]);
export const TargetName = Type.String({ minLength: 1, maxLength: 40, pattern: "^[a-z0-9][a-z0-9-]*$" });
export const EmailAddress = Type.String({ format: "email", maxLength: 254 });
export const HttpsUrl = Type.String({ format: "uri", pattern: "^https://", maxLength: 2048 });

const Subscription = Type.Array(AlertEventName, { minItems: 1, uniqueItems: true });

const TargetOptions = {
  name: Type.Optional(TargetName),
  on: Type.Optional(Subscription),
  enabled: Type.Optional(Type.Boolean()),
};

export const TargetInput = Type.Union([
  Type.Object({ channel: Type.Literal("mail"), ...TargetOptions, to: Type.Array(EmailAddress, { minItems: 1, maxItems: 20, uniqueItems: true }) }),
  Type.Object({ channel: Type.Literal("webhook"), ...TargetOptions, url: HttpsUrl }),
  Type.Object({ channel: Type.Literal("discord"), ...TargetOptions, url: HttpsUrl }),
]);

export const IssueAlert = Type.Object({
  name: oneOf(["issue.new", "issue.regression"]),
  project: Type.String(),
  issue: Type.Object({
    id: Type.String(),
    title: Type.String(),
    culprit: nullable(Type.String()),
    level: oneOf(["error", "warning"]),
    count: Count,
    firstSeen: Timestamp,
    lastSeen: Timestamp,
    lastRelease: nullable(Type.String()),
    url: Type.String({ format: "uri" }),
  }),
});

export const AlertEvent = Type.Union([IssueAlert]);
export const WebhookBody = Type.Object({ v: Type.Literal(1), sentAt: Timestamp, events: Type.Array(AlertEvent) });
```

`AlertTarget`, what the API answers, is the same union with every default resolved plus `id`, `project`, `state` (`active`, `paused` or `failing`), `stateReason`, `createdAt` and `updatedAt`.

The SDK narrows the schema types for the editor: `EmailAddress` becomes `${string}@${string}.${string}`, `HttpsUrl` becomes `https://${string}`, `to` becomes a non-empty tuple and durations become `${number}${"s" | "m" | "h" | "d"}`. The schema stays the rule; the narrower types catch mistakes earlier.

### Engine

`packages/engine/src/alerts/`. Every function returns a `Result`; the core knows only the ports, never SMTP or HTTP.

```ts
export type ServerPlugin = {
  name: string;
  routes: (app: RouteHost) => void;
  jobs: { [name: string]: Job };
};

export type RetryPolicy = { attempts: number; backoff: "exponential" | "fixed"; maxAge: Duration };

export type ChannelDriver<Name extends ChannelName = ChannelName> = {
  name: Name;
  retry: Partial<RetryPolicy>;
  ready: () => Result<null, EngineError>;
  send: (batch: DeliveryBatch<Name>, links: AlertLinks) => Promise<Result<null, EngineError>>;
};

export type MailTransport = {
  name: "smtp" | "resend";
  send: (message: MailMessage) => Promise<Result<null, EngineError>>;
};

export type AlertStore = {
  targets: (project: ProjectID) => Read<AlertTarget[]>;
  syncTargets: (project: ProjectID, targets: TargetInput[]) => Read<TargetChanges>;
  saveTarget: (project: ProjectID, target: TargetInput) => Read<TargetChanges>;
  removeTarget: (project: ProjectID, name: string) => Read<boolean>;
  rotateSecret: (project: ProjectID, name: string) => Read<string>;
  queue: (events: AlertEvent[]) => Read<{ queued: number }>;
  due: (now: Date, limit: number) => Read<DeliveryBatch[]>;
  settle: (outcomes: DeliveryOutcome[]) => Read<null>;
  deliveries: (project: ProjectID, status: Nullable<DeliveryStatus>, page: Page) => Read<{ rows: AlertDelivery[]; total: number }>;
};
```

| Function | Does |
| --- | --- |
| `alerts(options)` | The plugin: its routes, the alerts job, and the channels it was given |
| `mail(options)`, `webhook(options)`, `discord(options)` | Channel drivers |
| `smtp(url)`, `resend(key)` | Mail transports |
| `queueIssueAlerts(issues, alerts, now)` | Turns pending issues into alert events and queues their deliveries |
| `dispatchAlerts(alerts, channels, now)` | Sends due batches and settles each outcome with the retry policy |
| `nextAttempt(policy, attempts, createdAt, now)` | Pure: the next attempt time, or null when the policy ran out |
| `renderMail(batch, links)` | Pure: a batch to `{ subject, text, html }` |
| `renderDiscord(batch, links)` | Pure: a batch to a Discord message |
| `signBody(body, secret, timestamp)` | Pure: the `sha256=<hex>` value |

### Mail

One mail per target per run with every alert in it, newest first, in plain text and HTML (dark neutral, no colours or icons). Links go to the API's issue route until the v2 dashboard exists; `AlertLinks` is the one place that builds them.

```text
Subject: [remcostoeten.nl] 2 new issues, 1 regression

NEW         TypeError: Cannot read properties of undefined (reading 'map')
            app/blog/[slug]/page.tsx · 14 times · release 1.4.2
            https://api.analytics.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/iss_42

REGRESSION  Failed to fetch
            app/api/views/route.ts · 7 times · resolved, seen again in 1.4.2
            https://api.analytics.remcostoeten.nl/v2/projects/remcostoeten.nl/issues/iss_17
```

### Storage

Migration `0029_add_alert_targets`, on the shared `baseEntity()` and `timestamps()` columns:

```sql
CREATE TABLE alert_targets (
  id text PRIMARY KEY,
  project_id text NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
  name text NOT NULL,
  channel text NOT NULL,
  events text[] NOT NULL,
  settings jsonb NOT NULL,
  webhook_secret text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, name)
);

CREATE TABLE alert_deliveries (
  id bigserial PRIMARY KEY,
  target_id text NOT NULL REFERENCES alert_targets (id) ON DELETE CASCADE,
  event_name text NOT NULL,
  subject_id text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (target_id, event_name, subject_id)
);
CREATE INDEX alert_deliveries_due_idx ON alert_deliveries (next_attempt_at) WHERE status = 'pending';
```

- `channel` is free text, not a check constraint, so a new channel needs no migration; the API only accepts channels the config enables.
- Mail credentials never reach the database; they live only in the environment.
- A webhook secret is stored per target, like GitHub and Stripe do: it only proves our requests to that receiver. It is generated by the API (`whsec_` plus 32 random bytes), shown once, and replaced by `rotate`.
- `issues.alerted_at` keeps meaning "queued", so E4.4's column stays.
- The cleanup job removes sent deliveries after 30 days and failed ones after 90.

### Routes

Present only when `alerts()` is in the config.

| Method | Path | Access | Does |
| --- | --- | --- | --- |
| GET | `/v2/projects/:project/alerts/targets` | admin | The project's targets |
| PUT | `/v2/projects/:project/alerts/targets` | admin | Replace them all (`sync`) and answer the changes |
| PUT | `/v2/projects/:project/alerts/targets/:name` | admin | Create or replace one (`set`) |
| DELETE | `/v2/projects/:project/alerts/targets/:name` | admin | Remove one |
| POST | `/v2/projects/:project/alerts/targets/:name/test` | admin | Send a sample alert now |
| POST | `/v2/projects/:project/alerts/targets/:name/rotate` | admin | New webhook secret, shown once |
| GET | `/v2/projects/:project/alerts/deliveries` | admin | Delivery history, `status` filter, paged |
| GET | `/v2/admin/alerts/status` | admin | Enabled channels, the mail transport without secrets, pending count, failing targets |
| POST | `/v2/admin/jobs/alerts` | cron secret | Queue and dispatch |

### Files

```text
packages/shared/src/http/                 built: request and the JSON verbs
packages/contract/src/alerts.ts
packages/engine/src/config.ts               defineConfig, ServerPlugin
packages/engine/src/alerts/
├─ plugin.ts            alerts()
├─ events.ts            AlertEvents, the event map
├─ queue-issues.ts      queueIssueAlerts
├─ dispatch.ts          dispatchAlerts
├─ retry.ts             nextAttempt, the default policy
├─ render-mail.ts       renderMail
├─ render-discord.ts    renderDiscord
├─ sign-body.ts         signBody
├─ channels/            mail.ts, webhook.ts, discord.ts
├─ transports/          smtp.ts (node:tls), resend.ts (fetch)
└─ index.ts
packages/engine/src/ports/alerts.ts          AlertStore
packages/engine/src/adapters/drizzle-alerts.ts
apps/api/analytics.config.ts
apps/api/src/modules/alerts/                 route.ts, service.ts
packages/sdk/src/admin/                      create-admin.ts, targets.ts, reads.ts, types.ts, index.ts
packages/sdk/src/server/alert-route.ts       alertRoute, verifyAlert
```

## Extending

**A new alert event**, such as `traffic.spike`:

1. Add its schema to the `AlertEvent` union and its name to `AlertEventName` in the contract.
2. Add it to `AlertEvents` in `events.ts`; the compiler then lists every renderer and `alertRoute` handler type that must handle it.
3. Write a producer, `queue-traffic.ts`, and call it from the alerts job.
4. Add its section to `renderMail` and `renderDiscord` with fixture tests.

**A new channel**, such as `slack`:

1. Add `slack` to `ChannelName` and its target schema to `TargetInput` in the contract.
2. Write `channels/slack.ts` returning a `ChannelDriver<"slack">`, and a `renderSlack` beside the other renderers.
3. Add a `slack()` builder to the admin client.

**A new mail transport**, such as SES over HTTP: write `transports/ses.ts` returning a `MailTransport`, using `postJson`. Nothing else changes; the config passes it to `mail({ transport: ses(...) })`.

## Tests

- Engine: queue and dispatch against the memory store and a memory transport with a fixed clock, covering success, every retry step of both backoffs, `maxAge`, a channel's retry override, a failing target beside a working one, and idempotent re-queueing.
- `smtp()` against a scripted fake SMTP server on a local socket: login, `STARTTLS`, refusing to send unencrypted, and each server error.
- `nextAttempt`, `renderMail`, `renderDiscord` and `signBody` against fixed expected output.
- API on PGlite: each route's access, validation paths, the "not enabled" answers, `sync` changes, `test` through the memory transport, and the job's answer; a config without `alerts()` has none of the routes.
- SDK: `createAdmin` and `alertRoute` against the API app in memory, and type tests (`expectTypeOf`) for every row of "What the editor catches".

## Roadmap

- **Resend by hand**: `admin.alerts.resend(deliveryId)` and `POST /v2/projects/:project/alerts/deliveries/:id/resend` send a `failed` delivery to its target again, for example after a webhook was down; one call to put behind a button on your own admin page.
- Slack channel, traffic events, daily digests, quiet hours per target.
- React hooks over the admin client's reads.

## Decided

| Question | Answer |
| --- | --- |
| Mail provider per deployment or per project | Per deployment, in the config; credentials stay in the environment |
| Outside dependencies | None: SMTP on `node:tls`, Resend on `fetch` |
| Which channels | Mail, webhook and Discord, each optional |
| How projects set targets | `sync`, with single-target methods beside it |
| Admin client | A module of the SDK package: `@spoar/sdk/admin` |
| Retries | Configurable per plugin and per channel; default 5 attempts, exponential, 24 hours |
| Syntax | Functions taking one object, not chains |
