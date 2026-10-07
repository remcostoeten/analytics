# SDK design

The SDK is one flat, typed client: `createAnalytics<Events>()` returns an object whose methods cover the common cases directly, plus `scope()` for features and components and `use()` for plugins added later. This tab compares the five shapes you proposed, then specifies the chosen API, how it is used in every environment, and how it is written inside.

## Five shapes compared

| Shape | Example | Verdict |
| --- | --- | --- |
| A. Flat client, plugins in config | `analytics.track('signup', { plan: 'pro' })` | **Base.** Shortest code for the 95% case, one autocomplete list of about 15 methods, plugins fixed at creation so bundlers drop the unused ones |
| B. Namespaces | `analytics.events.track(...)`, `analytics.users.identify(...)` | **Only for consent.** Longer calls for every event, and the split is arbitrary (is a pageview an event or a page?). `consent` keeps a namespace because it is a small state machine with its own `status()` |
| C. Scopes | `analytics.scope({ area: 'checkout' }).track(...)` | **Added.** Lets a feature or component tag everything it sends without repeating itself. Scope values go into `tags`, not into the typed props, so `Events` typing stays exact |
| D. Callable client | `analytics('signup', { plan: 'pro' })` | **Rejected.** A value that is both a function and an object is awkward to type, hides what the call does, and gives no autocomplete for the event name until you know the trick |
| E. `use()` then `start()` | `analytics.use(errors()); analytics.start()` | **Half.** `use()` is kept for plugins that should load later, such as after consent or through a lazy import. `start()` is dropped: forgetting it would silently send nothing, so the client starts itself in the browser unless `autostart: false` |

## The API

```ts
import { createAnalytics } from "@spoar/sdk";
import { errors, outboundLinks, scrollDepth, speedInsights } from "@spoar/sdk/plugins";
import type { Events } from "./events";

export const analytics = createAnalytics<Events>({
  project: "remcostoeten.nl",
  key: "pk_live_...",
  endpoint: "/_ra",
  consent: "required",
  release: process.env.NEXT_PUBLIC_RELEASE,
  plugins: [speedInsights({ sampleRate: 1 }), scrollDepth(), outboundLinks(), errors()],
});
```

| Method | Returns | What it does |
| --- | --- | --- |
| `track(name, props?)` | `void` | Sends a custom event. `name` autocompletes from `Events` and `props` is typed for that name; an event declared with no props takes no second argument |
| `page(props?)` | `void` | Sends a pageview now. The default `pageviews` plugin calls it on every navigation, so apps rarely do |
| `identify(userId, traits?)` | `void` | Links this visitor to a user and stores traits, only with consent |
| `register(props)` | `void` | Adds props to every later event, such as an experiment variant or app version |
| `captureError(error, context?)` | `void` | Records an error with optional tags, extra data, level and fingerprint |
| `captureMessage(message, context?)` | `void` | Records a non-exception problem, level `warning` by default |
| `scope(tags)` | `ScopedAnalytics<Events>` | A view of the same client that adds `tags` to everything it sends; scopes nest |
| `use(plugin)` | `() => void` | Adds a plugin after creation and returns a function that removes it |
| `consent.grant()`, `consent.revoke()`, `consent.status()` | `void`, `void`, `"granted" \| "denied" \| "unset"` | Consent, remembered across reloads and applied to the site's other open tabs at once through the `storage` event; revoking clears stored identity |
| `optOut()`, `optIn()`, `isOptedOut()` | `void`, `void`, `boolean` | Stop or resume all sending from this browser, in every open tab |
| `reset()` | `void` | New visitor and session, cleared identity, registered props and route; call on logout |
| `flush()` | `Promise<FlushResult>` | Sends everything queued now and reports accepted, duplicate and failed counts |
| `shutdown()` | `Promise<void>` | Flushes, removes plugins and listeners; for tests and single-page app teardown |
| `on("error" \| "send" \| "drop", handler)` | `() => void` | Listen to delivery problems (`RA_INGEST_FAILED`, and `RA_INGEST_REJECTED` for each event rejected inside a 202), sends, and dropped events with their reason (`opt-out`, `dnt`, `consent`, `beforeSend`) |
| `status()` | `Status` | Queue size, consent, endpoint, last error, last successful send |

Config:

| Option | Default | Meaning |
| --- | --- | --- |
| `project`, `key` | required | Project slug and public key |
| `endpoint` | required | Where events go: a same-origin path such as `/_ra` behind the proxy, or the API's full URL |
| `consent` | `"optional"` | `"required"` holds everything until `consent.grant()`; queued calls are replayed after it |
| `plugins` | `[]` | Plugins to start with; `pageviews` is always included unless `pageviews: false` |
| `pageviews` | `true` | Automatic pageviews on load and navigation |
| `mode` | `"auto"` | `"development"` logs and sends nothing unless `endpoint` is set explicitly; `"auto"` reads `NODE_ENV` |
| `debug` | `false` | `[ra]` logs in the console; also switched on with `?ra=debug` and off with `?ra=nodebug`, which keeps the visitor id |
| `release`, `environment` | none | Attached to every event and error |
| `beforeSend` | none | `(event) => event \| null` to change or drop any event |
| `strict` | `false` | `true` rejects event names that are not in `Events` at compile time |
| `autostart` | `true` in browsers | `false` for tests or when the app decides when tracking may begin |

Privacy and delivery rules the core applies without options: Do Not Track (`navigator.doNotTrack` is `"1"`) and Global Privacy Control drop every event with the reason `dnt` and store nothing. The `__ra` key is written only once sending is allowed, except the visitor's own consent, opt-out and debug choices, and every write re-reads it so a change made in another tab is never overwritten. Props are cut to 25, keys and strings to 255 characters (2048 for `stack` and `breadcrumbs` on `error` events), the limits ingest enforces too. Each batch body stays under 60 KB and a single event over it is dropped as a 413. A network error, 429 or 5xx retries after 1, 4 and 16 seconds, or after `Retry-After` capped at 16 seconds, and batches waiting for a retry are sent when the page unloads. An empty `key` leaves the `key` query parameter out.

Groups (companies, workspaces, teams) come from the `groups<Groups>()` plugin: `set(type, id, traits?)` sends a `group` event and puts every later event in that group, read back as the `group:<type>` dimension. The core stays under its budget because the plugin is opt-in.

The server client, `createServerAnalytics<Events>()`, has the same `track`, `identify`, `group`, `captureError`, `captureMessage`, `scope`, `flush` and `shutdown`, plus `withErrors(handler)`. Every server method resolves to `{ ok, error, accepted, duplicates, failed }` and never throws. The React entry has `AnalyticsProvider`, `useAnalytics()` returning the same typed client, `TrackClick`, `ErrorBoundary`, `useRoutePageviews` for router adapters and `computeRoute`; the `./next` entry has the `Analytics` component that supplies routes.

## Usage

**One event list, shared by browser and server.** `events.ts`:

```ts
import type { NoProps } from "@spoar/sdk";

export type Events = {
  signup: { plan: "free" | "pro" };
  checkout: { revenue: number; currency: string; orderId: string };
  search: { query: string; results: number };
  newsletter_subscribed: NoProps;
};
```

**Browser, plain.**

```ts
analytics.track("signup", { plan: "pro" });
analytics.track("newsletter_subscribed");
analytics.identify("user_123", { plan: "pro" });
analytics.register({ experiment: "hero-b" });

const checkout = analytics.scope({ area: "checkout" });
checkout.track("checkout", { revenue: 49, currency: "EUR", orderId: "order_123" });

function onAcceptCookies() {
  analytics.consent.grant();
}

function onLogout() {
  analytics.reset();
}
```

**Plugins added later**, for example only after consent:

```ts
function onAcceptCookies() {
  analytics.consent.grant();
  import("@spoar/sdk/plugins").then((plugins) => {
    analytics.use(plugins.speedInsights({ sampleRate: 0.5 }));
  });
}
```

**React and Next.** `app/layout.tsx`:

```tsx
import { AnalyticsProvider } from "@spoar/sdk/react";
import { Analytics } from "@spoar/sdk/next";
import { analytics } from "@/lib/analytics";

export default function RootLayout({ children }: Props) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider client={analytics}>
          <Analytics />
          {children}
        </AnalyticsProvider>
      </body>
    </html>
  );
}
```

`<Analytics />` supplies the route template (`/blog/[slug]`) from Next's router, so pageviews are grouped by route. It sends the pageviews itself, so the client is created with `pageviews: false`. It lives in its own `./next` entry so that `./react` never imports `next/navigation` in apps without Next. In a component:

```tsx
function UpgradeButton() {
  const analytics = useAnalytics();
  return <button onClick={() => analytics.track("signup", { plan: "pro" })}>Upgrade</button>;
}
```

**Server.** `lib/analytics-server.ts` and a route handler:

```ts
import { createServerAnalytics } from "@spoar/sdk/server";
import type { Events } from "./events";

export const serverAnalytics = createServerAnalytics<Events>({
  project: "remcostoeten.nl",
  secret: env.RA_SECRET,
  endpoint: "https://api.analytics.remcostoeten.nl",
});

export const POST = serverAnalytics.withErrors(async (request) => {
  const order = await createOrder(request);
  serverAnalytics.track("checkout", { revenue: order.total, currency: "EUR", orderId: order.id }, { request });
  return Response.json(order);
});
```

Passing `request` (or `headers`) forwards the visitor's user agent and IP, the site's origin as `Origin` and the admin session cookie `ra.session_token` alone. Without either, the event has no IP or user agent, and an `origin` option on the client or the call gives it a host. The event joins the browser's visit only when the call passes `visitor` and `session`; otherwise it uses the shared id `serverVisitor` (`server`), which reads count in events but never as a visitor or a session. `withErrors` captures anything the handler throws, rethrows it, and flushes through `waitUntil` so the response is never delayed.

**Proxy**, the one line that gets events past ad blockers. In the Next App Router a folder starting with an underscore is private, so the folder is named %5Fra to serve /\_ra. `app/%5Fra/route.ts`:

```ts
import { createProxy } from "@spoar/sdk/proxy";

export const POST = createProxy({ secret: env.RA_SECRET, endpoint: "https://api.analytics.remcostoeten.nl" });
```

The proxy refuses bodies over 60 KB, adds the secret and the visitor's IP and user agent, and forwards the page's `Origin` (or the site's own origin) and the admin session cookie and no other cookie.

The `/admin` entry (alert targets, the read methods and annotations) is a shim over `@spoar/client`, the typed read and admin client in `packages/client` that covers every read route as a chainable scope; `verifyAlert` in `/server` is specified in [alerts.md](alerts.md).

## Error tracking in code

The `errors` plugin catches what nobody caught; `captureError` and `captureMessage` are for what you catch yourself. Everything lands in the same issues.

```ts
import { errors } from "@spoar/sdk/plugins";

export const analytics = createAnalytics<Events>({
  project: "remcostoeten.nl",
  key: "pk_live_...",
  endpoint: "/_ra",
  release: process.env.NEXT_PUBLIC_RELEASE,
  environment: "production",
  plugins: [errors({ ignore: [/ResizeObserver loop/], sampleRate: 1 })],
});
```

Caught errors, with context:

```ts
async function saveNote(note: Note) {
  try {
    await api.notes.save(note);
  } catch (error) {
    analytics.captureError(error, {
      tags: { feature: "notes" },
      extra: { noteId: note.id, size: note.body.length },
    });
    notify.error("Could not save the note");
  }
}

analytics.captureMessage("Payment provider responded slowly", {
  level: "warning",
  tags: { provider: "stripe" },
});
```

Scopes tag errors the same way they tag events, and `identify` links errors to the user:

```ts
const editor = analytics.scope({ feature: "editor" });
editor.captureError(error);
```

Custom grouping, when different messages are really one problem:

```ts
analytics.captureError(error, { fingerprint: ["stripe-timeout"] });
```

React render errors:

```tsx
<ErrorBoundary fallback={<CrashScreen />} tags={{ area: "dashboard" }}>
  <Dashboard />
</ErrorBoundary>
```

Server errors: `serverAnalytics.withErrors(handler)` as in Usage, or directly in a job:

```ts
export async function nightlyImport() {
  try {
    await runImport();
  } catch (error) {
    serverAnalytics.captureError(error, { tags: { job: "nightly-import" } });
    await serverAnalytics.flush();
    throw error;
  }
}
```

Source maps, in CI after the build:

```bash
bunx @spoar/sdk sourcemaps upload --release "$GITHUB_SHA" --dir .next/static
```

`captureError` takes `unknown`, because JavaScript can throw anything and a `catch` variable is `unknown`. It is the one public parameter where the anti-slop `unknown` rule is turned off, with a one-line reason; the SDK parses the value into a typed `CapturedError` straight away.

### Compared with Sentry

| Sentry does | v2 |
| --- | --- |
| Automatic capture of uncaught errors and rejections | Yes, `errors` plugin |
| Manual capture of errors and messages | Yes, `captureError`, `captureMessage` |
| Tags, extra data, level, user | Yes, context argument, scopes and `identify` |
| Breadcrumbs | Yes, last 20 navigations, clicks, fetches and `[ra]` events |
| Release and environment | Yes, config options |
| Source maps | Yes, upload CLI, in a later phase |
| Grouping and custom fingerprints | Yes |
| Resolve, ignore, regressions | Yes |
| Ignore rules | Yes, `ignore` patterns in the plugin and per-project rules in the API |
| Affected users, browsers, pages per issue | Yes, any breakdown with `filter[issue]=...` |
| Alerts | Yes, webhook and email for new issues and regressions |
| Server and job errors | Yes, `withErrors` and `captureError` on the server client |
| React error boundary | Yes |
| Performance tracing across services | No; speed insights covers the browser only |
| Session replay | No, by design |
| User feedback form on crash | No, could be a later plugin |
| Assigning issues, comments, GitHub links | No; single owner for now |

That is enough to run your sites without Sentry: every error is captured with context, grouped, deduplicated, alerted on and tied to a release and a user. What is left out is team workflow and replay, not error coverage. The API reference gains `filter[issue]` and `/v2/projects/:project/error-rules` (ignore patterns and mute-until per issue) for this.

## How it is written inside

The client is a factory function that returns a plain object of functions, closing over one state object; no classes. Each part is a small module the factory wires together:

```ts
export function createAnalytics<Events extends EventMap = EventMap>(
  config: AnalyticsConfig,
): Analytics<Events> {
  const state = createState(config);
  const queue = createQueue(state, config.transport ?? beacon(config));
  const host = createPluginHost(state);

  function track<Name extends EventName<Events>>(name: Name, ...args: PropsArgs<Events, Name>) {
    host.send(buildEvent(state, name, args.at(0) ?? {}), queue);
  }

  function scope(tags: Tags): ScopedAnalytics<Events> {
    return createScope(client, tags);
  }

  const client: Analytics<Events> = { track, page, identify, register, captureError, captureMessage, scope, use: host.use, consent: createConsent(state), optOut, optIn, isOptedOut, reset, flush: queue.flush, shutdown, on: state.on, status };

  for (const plugin of withDefaults(config)) host.use(plugin, client);
  return client;
}
```

The typing that makes `track` pleasant:

```ts
export type NoProps = Record<never, never>;
export type EventMap = { [name: string]: Props };
export type EventName<Events extends EventMap> = Extract<keyof Events, string>;
export type PropsArgs<Events extends EventMap, Name extends EventName<Events>> =
  [keyof Events[Name]] extends [never] ? [] : [props: Events[Name]];
```

So `track("newsletter_subscribed")` takes no props, `track("signup", { plan: "pro" })` requires exactly its props, and a typo in the event name is a compile error.

A plugin is a named `setup` that receives the client and returns its cleanup:

```ts
export function notFound(): Plugin {
  return definePlugin({
    name: "not-found",
    setup: (client) => {
      if (!document.querySelector("meta[name=ra-not-found]")) return noop;
      client.track("not_found", { referrer: document.referrer });
      return noop;
    },
  });
}
```

The hooks a plugin may add in `setup`: `client.beforeSend(fn)` to change or drop events in registration order, `client.onPage(fn)`, `client.onHidden(fn)` and `client.onConsent(fn)`. Plugins never import each other, and the core never imports a plugin except `pageviews`, which is why unused plugins cost nothing in the bundle.

File layout inside `packages/sdk/src`: `core/client.ts` (the factory above), `core/state.ts`, `core/queue.ts`, `core/plugin-host.ts`, `core/scope.ts`, `core/consent.ts`, `core/identity.ts`, `core/storage.ts`, `core/build-event.ts`, `transports/beacon.ts`, `transports/proxy.ts`, one file per plugin in `plugins/`, and `react/`, `server/`, `proxy/` entries. Every exported function carries the house JSDoc block with `@name`, `@description` and `@example`.
