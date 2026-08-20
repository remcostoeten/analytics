import type {
	AdapterId,
	Analytics,
	EventName,
	Properties,
	PropertyArgs,
	ScopedEvents,
} from "./index";

type Expect<TValue extends true> = TValue;

type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type Events = {
	"note.created": { noteId: string };
	"editor.opened": { source?: string };
	"editor.toolbar.clicked": { button: string };
};

type Registered = Record<"remco", { a: 1 }> & Record<"posthog", { b: 2 }>;

export type RequiredProperties = Expect<
	Equal<PropertyArgs<{ noteId: string }>, [properties: { noteId: string }]>
>;

export type OptionalProperties = Expect<
	Equal<PropertyArgs<{ source?: string }>, [properties?: { source?: string }]>
>;

export type LooseProperties = Expect<Equal<PropertyArgs<Properties>, [properties?: Properties]>>;

export type RegisteredIds = Expect<Equal<AdapterId<Registered>, "remco" | "posthog">>;

export type NoIdsBeforeUse = Expect<Equal<AdapterId<Record<never, never>>, never>>;

export type ProviderInference = Expect<
	Equal<ReturnType<Analytics<Events, Registered>["provider"]>, { a: 1 } | { b: 2 } | undefined>
>;

export type MiddlewareNames = Expect<
	Equal<
		EventName<Events>,
		"note.created" | "editor.opened" | "editor.toolbar.clicked" | "page" | "identify"
	>
>;

export type ScopeNarrows = Expect<
	Equal<keyof ScopedEvents<Events, "editor">, "opened" | "toolbar.clicked">
>;
