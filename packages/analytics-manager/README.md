# @remcostoeten/analytics-manager

Typed, fluent analytics orchestration. Your product code talks to one API; adapters translate every event to `@remcostoeten/analytics`, PostHog, Vercel Analytics, or anything else you plug in.

Zero runtime dependencies. Every provider SDK is an optional peer dependency, loaded lazily and only if you register its adapter.

```
Application -> Analytics Manager -> Middleware -> Adapters
```

## Install

```bash
bun add @remcostoeten/analytics-manager
```

Then install the SDK for each adapter you register — `@remcostoeten/analytics` for `remco()`, `posthog-js` for `posthog()`, `@vercel/analytics` for `vercel()`. They are optional peers so that registering one does not pull in the others, but an adapter whose SDK is missing cannot send anything: it reports once at startup, stays inactive, and answers `{ ok: true, skipped: true }` for every event rather than claiming success.

The built-in adapters wrap browser SDKs. When the manager is built on the server — a Next.js module evaluated during SSR, a test runner — they never import their SDK and stay inactive, so a module-level `createAnalytics().build()` is safe to share between server and client code. Inject a client with `.client()` to opt out of that guard; the injected client is used as-is, observers included.

## Quick start

```ts
import {
	createAnalytics,
	logger,
	posthog,
	redact,
	remco,
	vercel,
} from "@remcostoeten/analytics-manager";

type AppEvents = {
	"note.created": { noteId: string };
	"editor.opened": { source: string };
	"checkout.completed": { revenue: number; currency: string };
};

export const analytics = createAnalytics<AppEvents>()
	.app("skriuw")
	.environment(process.env.NODE_ENV)
	.context({ version: APP_VERSION })
	.use(remco().project("skriuw").errors())
	.use(posthog().token(process.env.NEXT_PUBLIC_POSTHOG_TOKEN))
	.when(isVercel, vercel())
	.when(process.env.NODE_ENV !== "production", logger())
	.pipe(redact("email"))
	.onError(reportToSentry)
	.build();

analytics.track("note.created", { noteId: note.id });
analytics.scope("editor").track("opened", { source: "sidebar" });
```

The type argument is optional. Without it, any event name and any properties are accepted.

## Builder

Configuration time only. Every call returns a new builder, so a builder can be shared and branched safely.

| Method                        | Purpose                                                                                                                                                                                                                     |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createAnalytics<TEvents>()`  | Entry point, creates a typed builder.                                                                                                                                                                                       |
| `.app(name)`                  | Application name, added to every event context.                                                                                                                                                                             |
| `.environment(name)`          | Environment name, added to every event context.                                                                                                                                                                             |
| `.context(value \| resolver)` | Global context. Multiple calls merge, last write wins. Resolvers run once at `build()` — use `enrich()` for per-event context.                                                                                              |
| `.use(adapter)`               | Registers an adapter or adapter builder.                                                                                                                                                                                    |
| `.when(condition, adapter)`   | Registers conditionally. Accepts a boolean or a predicate.                                                                                                                                                                  |
| `.pipe(middleware)`           | Adds middleware, applied in registration order before dispatch.                                                                                                                                                             |
| `.onError(handler)`           | Receives every adapter failure as `{ adapter, stage, error }`. Without it, failures log to the console outside production. A handler that throws is itself logged outside production, together with the failure it dropped. |
| `.timeout(ms)`                | Upper bound for each adapter's `init`. Default `10000`, `0` disables it. An adapter that exceeds it is reported and skipped until its `init` eventually resolves.                                                           |
| `.build()`                    | Returns the immutable runtime and starts adapter initialization.                                                                                                                                                            |

`.app()`, `.environment()`, `.token()`, `.host()`, `.project()` and `.ingest()` accept `string | undefined`, so environment variables can be passed straight through. An undefined value is the same as not calling the method.

Duplicate adapter ids throw at `build()`, because ids address adapters in `.to()`, `.except()` and `.provider()`.

## Runtime

| Method                       | Purpose                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `track(name, properties)`    | Primary typed event API. Properties are required only when the event declares required keys.                                    |
| `event(name)`                | Starts the fluent event builder.                                                                                                |
| `page(properties?)`          | Page or screen view.                                                                                                            |
| `identify(userId, traits?)`  | Associates future events with a known user.                                                                                     |
| `group(type, id, traits?)`   | Associates the user with a group such as a company or workspace. Skipped by adapters without group support.                     |
| `alias(userId, previousId?)` | Links a known user id to a previous anonymous id. Skipped by adapters without alias support.                                    |
| `reset()`                    | Clears identity on adapters that support it.                                                                                    |
| `with(context)`              | New instance with extra context.                                                                                                |
| `scope(name)`                | New instance whose `track` event names are prefixed with `name.`. `page`, `identify`, `group` and `alias` keep their own names. |
| `provider(id)`               | Provider-specific escape hatch, typed per registered adapter.                                                                   |
| `ready()`                    | Resolves once every adapter has initialized, failed or timed out.                                                               |
| `flush()`                    | Flushes adapters that expose a flush capability.                                                                                |
| `destroy()`                  | Tears down adapters and disposes the runtime.                                                                                   |

`track`, `page`, `identify`, `group`, `alias` and `send` never throw. They return a per-adapter result:

```ts
const results = await analytics.track("note.created", { noteId: note.id });
// [{ adapter: "remco", ok: true }, { adapter: "posthog", ok: false, error: Error }]
```

Events sent before adapter initialization finishes are queued, not dropped. Events sent after `destroy()` — or while it is in progress — return an empty result, and `reset()`/`flush()` become no-ops. An adapter whose `init` throws or times out is reported through `onError` and reports `skipped` for every later event rather than failing repeatedly. A timed-out adapter cannot be cancelled; if its `init` later resolves it rejoins dispatch from that point, so a slow SDK is skipped while it loads rather than for the whole session. If it resolves after `destroy()` its `destroy` runs immediately so nothing it started outlives the runtime, and if it eventually rejects the real error is reported under `stage: "init"`. `reset()` and `flush()` skip failed or inactive adapters; `destroy()` always runs, once.

`with()` and `scope()` return views over the same underlying runtime: they share adapters, middleware and lifecycle, so `destroy()` on any view disposes all of them.

### Errors

Fire-and-forget calls never surface `SendResult`, so register a handler to see failures:

```ts
createAnalytics()
	.onError(({ adapter, stage, error }) => {
		Sentry.captureException(error, { tags: { adapter, stage } });
	})
	.build();
```

`stage` is one of `init`, `track`, `page`, `identify`, `group`, `alias`, `reset`, `flush`, `destroy`. A handler that throws is caught and logged; it cannot break dispatch.

### What the types actually guarantee

Pass an event map and the whole chain is checked, not just event names:

```ts
analytics.track("note.created", { noteId: note.id });

analytics.track("nope", {}); // unknown event
analytics.track("note.created"); // noteId is required, not optional
analytics.track("note.created", { noteId: 1 }); // wrong property type
analytics.event("note.created").property("notId", "n"); // unknown property

analytics.scope("editor").track("opened", { source: "sidebar" });
analytics.scope("editor").track("note.created"); // not an editor event
```

Properties are required exactly when the event declares required keys, and optional when every key is optional. Autocomplete offers event names at `track()`, and that event's property keys at `.property()`.

Adapter ids are inferred from the adapters you registered, so routing is checked too:

```ts
const analytics = createAnalytics<AppEvents>().use(remco()).use(posthog()).build();

analytics.event("checkout.completed").to("remco", "posthog");
analytics.event("checkout.completed").to("psthog"); // typo caught
analytics.event("checkout.completed").to("vercel"); // never registered
```

`provider()` infers its return type from the registered adapter, so no manual annotation:

```ts
const flags = analytics.provider("posthog"); // PosthogProvider | undefined
flags?.featureFlags.isEnabled("new-editor");
```

Middleware sees the same union — `event.name` is your event names plus `"page"`, `"identify"`, `"group"` and `"alias"`, inferred without annotating the helper:

```ts
.pipe(filter((event) => {
	return event.name !== "debug.render";  // event.name is the typed union
}))
```

## Fluent event builder

Use it when an event needs routing, event-level context, or is assembled across several steps. Drafts are immutable and dispatch only on `.send()`.

```ts
await analytics
	.event("checkout.completed")
	.property("orderId", order.id)
	.properties({ revenue: 49, currency: "EUR" })
	.context({ experiment: "checkout-v2" })
	.to("remco", "posthog")
	.send();
```

`.to(...ids)` restricts dispatch, `.except(...ids)` excludes. Both accept only the ids of adapters you registered. `.context()` stays out of event properties.

## Middleware

A middleware is `(event) => event | null`. Returning `null` drops the event, which is reported as `{ ok: true, skipped: true }`. A middleware that throws is reported to `onError` as `{ adapter: "middleware", stage, error }` and the event reports `{ ok: false, error }` for every targeted adapter that would have run (inactive or failed adapters still report `skipped`); the call still never rejects.

```ts
createAnalytics()
	.pipe(enrich({ version: APP_VERSION }))
	.pipe(redact("email", "phone"))
	.pipe(
		filter((event) => {
			return !event.name.startsWith("debug.");
		}),
	)
	.pipe(
		transform((event) => {
			return { ...event, name: event.name.toLowerCase() };
		}),
	)
	.build();
```

| Helper                      | Behavior                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `enrich(value \| resolver)` | Merges context. Resolvers run per event.                                               |
| `redact(...keys)`           | Removes keys from properties and context, recursing through nested objects and arrays. |
| `filter(predicate)`         | Drops events when the predicate is false.                                              |
| `transform(mapper)`         | Maps one event to another.                                                             |

Middleware applies to `track`, `page`, `identify`, `group` and `alias` alike.

## Adapters

Adapters expose only configuration that the underlying SDK actually has. Each one accepts `.client(instance)` so you can inject an already-initialized SDK or a stub in tests; otherwise the SDK is imported lazily on `build()`.

```ts
remco()
	.project("skriuw")
	.ingest("https://analytics-api.example.com")
	.path("/s/:token")
	.referrer(null)
	.errors()
	.clicks()
	.forms()
	.outboundLinks();

posthog()
	.token(env.POSTHOG_TOKEN)
	.host("https://eu.i.posthog.com")
	.pageviews()
	.autocapture()
	.sessionReplay();

vercel();

logger()
	.prefix("[analytics]")
	.sink((label, event) => {
		console.debug(label, event);
	});
```

`remco()` loads the React-free `@remcostoeten/analytics/browser` entry and falls back to `.app()` for its project id. Use `.path()` and `.referrer()` to replace sensitive browser location values before delivery. `posthog()` skips loading and initialization without a token. A PostHog client supplied through `.client()` is treated as already initialized, does not require `.token()`, and is never reinitialized. PostHog sends context plus traits as person properties on `identify` (app and environment are also registered once as super properties for manager-initialized clients), and maps `group` and `alias` onto `posthog.group` and `posthog.alias` — reporting `skipped` when the loaded client lacks them. `vercel()` injects Vercel Analytics when it loads the SDK itself and only handles `track`; `page`, `identify`, `group`, `alias` and `reset` report as skipped because Vercel's injected script owns pageview tracking and its custom events cannot represent the other operations. A Vercel client supplied through `.client()` is assumed to be ready. `logger()` prints every event and is meant for development; target it with `.to("logger")` or drop it with `.when(isDev, logger())`.

### Provider escape hatch

```ts
const flags = analytics.provider("posthog"); // PosthogProvider | undefined

if (flags?.featureFlags.isEnabled("new-editor")) {
	flags.replay.start();
}
```

The return type is inferred from the adapter registered under that id. `PosthogProvider` is exported for annotating your own helpers.

### Writing an adapter

An adapter is a plain object. Everything except `id` is optional; a missing handler reports as skipped rather than failing, and a handler that returns `false` reports `skipped` for that call — use it when the underlying SDK cannot represent the event.

```ts
import type { Adapter } from "@remcostoeten/analytics-manager";

function logger(): Adapter {
	return {
		id: "logger",
		track: function track(event) {
			console.log(event.name, event.properties, event.context);
		},
	};
}
```

For a fluent adapter, return `{ build: () => Adapter }` instead. `.use()` accepts both.

`init(config)` receives `app`, `environment`, the resolved `context`, and `report(error, stage)` for surfacing non-fatal problems to the user's `onError` handler under an explicit stage. Throwing from `init` marks the adapter as failed; it is skipped for every later event and still receives `destroy()`.

## React

```tsx
import {
	AnalyticsProvider,
	useAnalytics,
	usePageview,
} from "@remcostoeten/analytics-manager/react";

export function Providers({ children }: { children: ReactNode }) {
	return <AnalyticsProvider analytics={analytics}>{children}</AnalyticsProvider>;
}

function SaveButton() {
	const analytics = useAnalytics<AppEvents>();
	return <button onClick={() => analytics.track("note.created", { noteId })}>Save</button>;
}

function PageTracker() {
	usePageview(usePathname());
	return null;
}
```

The `react` entry is marked `"use client"` and declares `react` as an optional peer. `useAnalytics` throws outside a provider. `usePageview(path, properties?)` sends one `page` event per distinct `path` — re-renders, StrictMode double effects and a new provider value do not resend it — and does nothing while `path` is `null` or `undefined`.

## Not in v0.1

`.route()`, `.consent()`, `.sample()`, a server-side dispatch path, and semantic domain methods such as `transaction()`, `search()` and `experiment()` are deliberately deferred until the adapter and dispatch contract has settled. All of them can be added without changing the foundation.

## License

MIT
