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

Then install whichever providers you use: `@remcostoeten/analytics`, `posthog-js`, `@vercel/analytics`.

## Quick start

```ts
import { createAnalytics, posthog, redact, remco, vercel } from "@remcostoeten/analytics-manager";

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
	.pipe(redact("email"))
	.build();

analytics.track("note.created", { noteId: note.id });
analytics.scope("editor").track("opened", { source: "sidebar" });
```

The type argument is optional. Without it, any event name and any properties are accepted.

## Builder

Configuration time only. Every call returns a new builder, so a builder can be shared and branched safely.

| Method                        | Purpose                                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `createAnalytics<TEvents>()`  | Entry point, creates a typed builder.                                                                                          |
| `.app(name)`                  | Application name, added to every event context.                                                                                |
| `.environment(name)`          | Environment name, added to every event context.                                                                                |
| `.context(value \| resolver)` | Global context. Multiple calls merge, last write wins. Resolvers run once at `build()` — use `enrich()` for per-event context. |
| `.use(adapter)`               | Registers an adapter or adapter builder.                                                                                       |
| `.when(condition, adapter)`   | Registers conditionally. Accepts a boolean or a predicate.                                                                     |
| `.pipe(middleware)`           | Adds middleware, applied in registration order before dispatch.                                                                |
| `.build()`                    | Returns the immutable runtime and starts adapter initialization.                                                               |

Duplicate adapter ids throw at `build()`, because ids address adapters in `.to()`, `.except()` and `.provider()`.

## Runtime

| Method                      | Purpose                                                   |
| --------------------------- | --------------------------------------------------------- |
| `track(name, properties?)`  | Primary typed event API.                                  |
| `event(name)`               | Starts the fluent event builder.                          |
| `page(properties?)`         | Page or screen view.                                      |
| `identify(userId, traits?)` | Associates future events with a known user.               |
| `reset()`                   | Clears identity on adapters that support it.              |
| `with(context)`             | New instance with extra context.                          |
| `scope(name)`               | New instance whose event names are prefixed with `name.`. |
| `provider(id)`              | Provider-specific escape hatch.                           |
| `flush()`                   | Flushes adapters that expose a flush capability.          |
| `destroy()`                 | Tears down adapters and disposes the runtime.             |

`track`, `page`, `identify` and `send` never throw. They return a per-adapter result:

```ts
const results = await analytics.track("note.created", { noteId: note.id });
// [{ adapter: "remco", ok: true }, { adapter: "posthog", ok: false, error: Error }]
```

Events sent before adapter initialization finishes are queued, not dropped. Events sent after `destroy()` return an empty result.

### Scopes are typed

`scope()` narrows the event map by prefix, so a scoped instance only accepts the events that belong to it:

```ts
analytics.scope("editor").track("opened", { source: "sidebar" });
analytics.scope("editor").track("note.created");
//                              ^ type error, not an editor event
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

`.to(...ids)` restricts dispatch, `.except(...ids)` excludes. `.context()` stays out of event properties.

## Middleware

A middleware is `(event) => event | null`. Returning `null` drops the event, which is reported as `{ ok: true, skipped: true }`.

```ts
createAnalytics()
	.pipe(enrich({ version: APP_VERSION }))
	.pipe(redact("email", "phone"))
	.pipe(
		filter(function isProduct(event) {
			return !event.name.startsWith("debug.");
		}),
	)
	.pipe(
		transform(function lowercase(event) {
			return { ...event, name: event.name.toLowerCase() };
		}),
	)
	.build();
```

| Helper                      | Behavior                                                            |
| --------------------------- | ------------------------------------------------------------------- |
| `enrich(value \| resolver)` | Merges context. Resolvers run per event.                            |
| `redact(...keys)`           | Removes keys from properties and context, including nested objects. |
| `filter(predicate)`         | Drops events when the predicate is false.                           |
| `transform(mapper)`         | Maps one event to another.                                          |

Middleware applies to `track`, `page` and `identify` alike.

## Adapters

Adapters expose only configuration that the underlying SDK actually has. Each one accepts `.client(instance)` so you can inject an already-initialized SDK or a stub in tests; otherwise the SDK is imported lazily on `build()`.

```ts
remco()
	.project("skriuw")
	.ingest("https://analytics-api.example.com")
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
```

`remco()` falls back to `.app()` for its project id. `posthog()` skips initialization without a token. `vercel()` only handles `track` — `identify` and `reset` report as skipped, because Vercel Analytics cannot represent them.

### Provider escape hatch

```ts
import type { PosthogProvider } from "@remcostoeten/analytics-manager";

const flags = analytics.provider<PosthogProvider>("posthog");

if (flags?.featureFlags.isEnabled("new-editor")) {
	flags.replay.start();
}
```

### Writing an adapter

An adapter is a plain object. Everything except `id` is optional; a missing handler reports as skipped rather than failing.

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

## Not in v0.1

`.route()`, `.consent()`, `.sample()`, and semantic domain methods such as `transaction()`, `search()` and `experiment()` are deliberately deferred until the adapter and dispatch contract has settled. All of them can be added without changing the foundation.

## License

MIT
