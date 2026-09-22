# AGENTS.md

Instructions for coding agents working on `@remcostoeten/analytics-manager`.

## Project intent

This repository is building a small, strongly typed analytics orchestration runtime for TypeScript applications.

It is **not** merely a React component that conditionally renders analytics SDKs.

The central idea is:

> Applications depend on one analytics API. Analytics vendors are adapters behind that API.

Initial providers:

- `@remcostoeten/analytics`
- Vercel Analytics
- PostHog

The architecture must make adding future providers straightforward without requiring application-level rewrites.

## Core design philosophy

### Prefer fluent functional APIs

The public API should favor readable composition:

```ts
const analytics = createAnalytics<AppEvents>()
	.app("skriuw")
	.use(remco().project("skriuw"))
	.when(isProduction, posthog().token(env.POSTHOG_KEY))
	.pipe(redactPII())
	.build();
```

Prefer:

```ts
posthog().token("...").sessionReplay();
```

over unnecessarily large option objects when a fluent API improves readability and type inference.

Do not force fluency where a plain function is clearer.

### Builders must be immutable

This is a hard requirement.

Do not implement fluent builders by mutating internal shared state.

This must be safe:

```ts
const base = createAnalytics().use(remco());

const production = base.use(posthog());
const development = base.use(consoleProvider());
```

Calling `.use()` on `base` must not change `base` or other builders derived from it.

Prefer structural sharing or inexpensive shallow copies over mutable configuration.

### Core must be framework agnostic

The analytics runtime must not depend on React, Next.js, browser globals, or one analytics vendor.

Keep framework-specific behavior behind integration boundaries.

Preferred separation:

```txt
core      -> analytics runtime, contracts, event pipeline
providers -> vendor adapters
react     -> React bindings/components/hooks
next      -> Next.js-specific integration if eventually needed
```

Do not import React from core modules.

### Providers are adapters, not the architecture

Do not model the core around PostHog, Vercel, or the current first-party SDK.

A provider should conform to a small internal contract and declare capabilities where necessary.

Common operations currently include:

```ts
track();
page();
identify();
reset();
```

Provider-specific capabilities must remain accessible without polluting the common interface.

### Avoid lowest-common-denominator abstractions

Do not hide useful provider functionality simply because another provider lacks it.

A future API may expose capabilities along the lines of:

```ts
analytics.provider("posthog").featureFlag("new-editor").isEnabled();
```

The exact API can evolve, but provider-specific escape hatches are intentional.

## TypeScript requirements

Type safety is a core product feature.

### Preserve event inference

Applications should be able to define:

```ts
type AppEvents = {
	"note.created": {
		noteId: string;
		source: "editor" | "command-palette";
	};
};
```

And receive compile-time validation:

```ts
analytics.track("note.created", {
	noteId: "123",
	source: "editor",
});
```

Do not casually widen:

```ts
keyof T
```

to:

```ts
string;
```

Do not use `any` to work around difficult generic relationships.

Prefer `unknown`, constrained generics, discriminated unions, mapped types, conditional types, and inference-preserving helpers.

### Avoid unnecessary explicit annotations

Let TypeScript infer local implementation details when the inferred type is correct.

Use explicit return types for public APIs when they improve stability or documentation.

### Type tests are expected

Important type behavior should be tested, including expected compile failures.

Particularly test:

- invalid event names;
- missing event properties;
- extra/invalid properties where appropriate;
- provider-name inference;
- fluent builder return types;
- capability typing;
- context accumulation;
- immutable builder branching.

## Runtime requirements

### Analytics must never break the host application

A provider failure must not crash normal application behavior.

Provider initialization and delivery should be isolated.

Errors may be reported to diagnostics/debug tooling, but failures in analytics are secondary to application functionality.

### Lazy-load vendor SDKs where practical

Do not eagerly import every browser analytics SDK into the initial client bundle.

Provider adapters should make lazy initialization/code splitting possible.

Be aware that dynamic imports still require dependencies to be resolvable by the consuming build/package graph.

Do not claim a missing package can be loaded at runtime through a normal ESM dynamic import.

### Keep the core small

Avoid bringing vendor SDKs or framework dependencies into core entry points.

Pay attention to package exports so consumers importing the core do not accidentally include React or provider code.

### No hidden global singleton by default

Prefer explicitly created analytics runtimes:

```ts
const analytics = createAnalytics().build();
```

over module-level hidden mutable state.

Framework integrations may provide convenient context access, but the core must remain instantiable and testable.

## Event pipeline

The intended event lifecycle is approximately:

```txt
create event
   ↓
merge context
   ↓
validate / normalize
   ↓
middleware
   ↓
consent/privacy checks
   ↓
routing
   ↓
provider delivery
```

Do not send an event to a provider before privacy/consent transformations that are intended to precede delivery.

## Middleware

Middleware should be composable and preferably expressed through `.pipe()`.

Potential middleware includes:

- enrichment;
- redaction;
- sampling;
- validation;
- deduplication;
- routing;
- debugging.

Favor small pure transformations.

Avoid middleware APIs that require mutation of an event object unless there is a strong performance reason and the behavior is carefully contained.

## Context

`with()` should derive a new analytics runtime/context rather than mutate the existing runtime.

Example:

```ts
const workspaceAnalytics = analytics.with({
	workspaceId: "abc",
});
```

The original `analytics` instance must remain unchanged.

Context precedence should be explicit and tested.

A reasonable default is:

```txt
global context
< scoped/derived context
< event properties
```

Do not silently overwrite event properties with lower-priority global context.

## Scopes

Scopes are intended to help build consistent event namespaces:

```ts
analytics.scope("editor").track("opened");
```

Potential result:

```txt
editor.opened
```

Scopes should compose without mutating parent instances.

Do not over-engineer wildcard/event-name parsing until concrete routing requirements demand it.

## Routing

Routing belongs in the analytics layer, not scattered through application feature code.

Support both:

- default provider fan-out;
- explicit event/provider routing.

The future fluent API may resemble:

```ts
.route("product.*")
  .to("remco", "posthog")
```

and:

```ts
analytics.event("checkout.completed").to("posthog").send();
```

Keep routing logic independent of provider implementations.

## Consent and privacy

Consent should be modeled above providers.

Providers may declare a required consent category, but the runtime owns enforcement.

Sensitive data should be transformable/redactable before third-party delivery.

Never add automatic collection of sensitive or identifying data as a convenience feature.

Do not make privacy-sensitive defaults more permissive without an explicit project decision.

## Naming conventions

Prefer lower-case provider IDs:

```txt
remco
vercel
posthog
```

Prefer dot-separated event names:

```txt
note.created
checkout.started
editor.opened
```

Avoid making event naming conventions impossible to override at the type/runtime level.

## Public API design

Before adding a public method, ask:

1. Is this core behavior, provider behavior, middleware, or framework integration?
2. Can it be composed from an existing primitive?
3. Does this keep the API readable when chained?
4. Does it preserve type inference?
5. Does it require mutation?
6. Does it couple the core to one provider?
7. Will this force every provider to implement a capability it does not naturally support?

Prefer a smaller set of strong primitives over many convenience aliases.

## Code quality

Prefer:

- small modules;
- explicit boundaries;
- pure functions;
- immutable data;
- descriptive generic names;
- narrow interfaces;
- tests around behavior rather than implementation;
- comments explaining non-obvious tradeoffs, not restating code.

Avoid:

- god objects;
- giant provider switches spread throughout the codebase;
- circular dependencies;
- provider imports from core;
- unnecessary classes when closures/builders are clearer;
- dependency injection frameworks;
- broad `Record<string, any>` types;
- premature abstractions for providers that do not exist yet.

## Tests

Every meaningful feature should include tests.

Test at least:

- immutable builders;
- provider fan-out;
- provider failure isolation;
- middleware order;
- context precedence;
- routing;
- disabled providers;
- lazy initialization boundaries where testable;
- typed event behavior;
- scopes;
- derived `with()` instances.

Provider adapters should be testable without performing real network requests.

Use lightweight fake/memory providers for core tests.

## Dependencies

Keep the dependency graph intentionally small.

Before adding a dependency, consider whether the behavior can be implemented clearly in a small amount of TypeScript.

Vendor SDK dependencies belong with their provider integration, not core.

Avoid adding a general-purpose utility dependency for trivial helpers.

## Documentation

Public APIs require concise examples.

When changing the API shape:

- update README examples;
- update relevant type tests;
- document breaking changes;
- keep aspirational examples clearly marked when they are not implemented yet.

Do not let the README claim behavior the package does not currently provide once a stable release exists.

## Current priorities

Unless a task says otherwise, prioritize work in this order:

1. core provider contract;
2. immutable analytics builder;
3. typed event model;
4. `track`, `page`, `identify`, `reset`;
5. first-party `@remcostoeten/analytics` adapter;
6. PostHog adapter;
7. Vercel adapter;
8. `with()` and `scope()`;
9. middleware pipeline;
10. routing/consent/debug tooling.

Keep the first implementation deliberately small. Build primitives before convenience layers.
