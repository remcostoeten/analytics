export type Primitive = string | number | boolean | null;
export type Value = Primitive | Value[] | { [key: string]: Value | undefined };
export type Properties = Record<string, Value | undefined>;
export type Context = Record<string, Value | undefined>;
export type Traits = Record<string, Value | undefined>;

export type EventMap = Record<string, Properties>;
export type AdapterMap = Record<string, unknown>;
export type Empty = Record<never, never>;

export type EventKind = "track" | "page" | "identify" | "group" | "alias";

export type EventName<TEvents extends EventMap> =
	| (keyof TEvents & string)
	| "page"
	| "identify"
	| "group"
	| "alias";

export type AnalyticsEvent<TName extends string = string> = {
	kind: EventKind;
	name: TName;
	properties: Properties;
	context: Context;
	userId?: string;
	previousId?: string;
	groupType?: string;
	groupId?: string;
	timestamp: number;
};

export type Middleware<TEvents extends EventMap = EventMap> = (
	event: AnalyticsEvent<EventName<TEvents>>,
) => AnalyticsEvent | null;

export type Stage = EventKind | "init" | "reset" | "flush" | "destroy";

export type AdapterFailure = {
	adapter: string;
	stage: Stage;
	error: Error;
};

export type ErrorHandler = (failure: AdapterFailure) => void;

export type RuntimeConfig = {
	app?: string;
	environment?: string;
	context: Context;
	report: (error: Error, stage: Stage) => void;
};

export type HandlerOutcome = void | boolean;

export type EventHandler = (event: AnalyticsEvent) => HandlerOutcome | Promise<HandlerOutcome>;

export type Adapter<TId extends string = string, TProvider = unknown> = {
	id: TId;
	init?: (config: RuntimeConfig) => void | Promise<void>;
	active?: () => boolean;
	track?: EventHandler;
	page?: EventHandler;
	identify?: EventHandler;
	group?: EventHandler;
	alias?: EventHandler;
	reset?: () => void | Promise<void>;
	flush?: () => void | Promise<void>;
	destroy?: () => void | Promise<void>;
	expose?: () => TProvider | undefined;
};

export type AdapterBuilder<TId extends string = string, TProvider = unknown> = {
	build: () => Adapter<TId, TProvider>;
};

export type AdapterSource<TId extends string = string, TProvider = unknown> =
	| Adapter<TId, TProvider>
	| AdapterBuilder<TId, TProvider>;

export type SendResult = {
	adapter: string;
	ok: boolean;
	skipped?: boolean;
	error?: Error;
};

export type Targets = {
	only?: string[];
	except?: string[];
};

export type ContextInput = Context | (() => Context);

export type AdapterId<TAdapters extends AdapterMap> = keyof TAdapters & string;

export type PropertyArgs<TProperties extends Properties> = Empty extends TProperties
	? [properties?: TProperties]
	: [properties: TProperties];

export type ScopedEvents<
	TEvents extends EventMap,
	TScope extends string,
> = string extends keyof TEvents
	? EventMap
	: {
			[Key in keyof TEvents as Key extends `${TScope}.${infer Rest}` ? Rest : never]: TEvents[Key];
		};

export type EventDraft<
	TProperties extends Properties,
	TAdapters extends AdapterMap = AdapterMap,
> = {
	property: <TKey extends keyof TProperties & string>(
		key: TKey,
		value: TProperties[TKey],
	) => EventDraft<TProperties, TAdapters>;
	properties: (values: Partial<TProperties>) => EventDraft<TProperties, TAdapters>;
	context: (values: Context) => EventDraft<TProperties, TAdapters>;
	to: (...adapters: AdapterId<TAdapters>[]) => EventDraft<TProperties, TAdapters>;
	except: (...adapters: AdapterId<TAdapters>[]) => EventDraft<TProperties, TAdapters>;
	send: () => Promise<SendResult[]>;
};

export type Analytics<
	TEvents extends EventMap = EventMap,
	TAdapters extends AdapterMap = AdapterMap,
> = {
	track: <TName extends keyof TEvents & string>(
		name: TName,
		...args: PropertyArgs<TEvents[TName]>
	) => Promise<SendResult[]>;
	event: <TName extends keyof TEvents & string>(
		name: TName,
	) => EventDraft<TEvents[TName], TAdapters>;
	page: (properties?: Properties) => Promise<SendResult[]>;
	identify: (userId: string, traits?: Traits) => Promise<SendResult[]>;
	group: (groupType: string, groupId: string, traits?: Traits) => Promise<SendResult[]>;
	alias: (userId: string, previousId?: string) => Promise<SendResult[]>;
	reset: () => Promise<void>;
	with: (context: Context) => Analytics<TEvents, TAdapters>;
	scope: <TScope extends string>(
		name: TScope,
	) => Analytics<ScopedEvents<TEvents, TScope>, TAdapters>;
	provider: <TId extends AdapterId<TAdapters>>(id: TId) => TAdapters[TId] | undefined;
	ready: () => Promise<void>;
	flush: () => Promise<void>;
	destroy: () => Promise<void>;
};

export type Builder<TEvents extends EventMap = EventMap, TAdapters extends AdapterMap = Empty> = {
	app: (name: string | undefined) => Builder<TEvents, TAdapters>;
	environment: (name: string | undefined) => Builder<TEvents, TAdapters>;
	context: (value: ContextInput) => Builder<TEvents, TAdapters>;
	use: <TId extends string, TProvider>(
		adapter: AdapterSource<TId, TProvider>,
	) => Builder<TEvents, TAdapters & Record<TId, TProvider>>;
	when: <TId extends string, TProvider>(
		condition: boolean | (() => boolean),
		adapter: AdapterSource<TId, TProvider>,
	) => Builder<TEvents, TAdapters & Record<TId, TProvider>>;
	pipe: (middleware: Middleware<TEvents>) => Builder<TEvents, TAdapters>;
	onError: (handler: ErrorHandler) => Builder<TEvents, TAdapters>;
	timeout: (milliseconds: number) => Builder<TEvents, TAdapters>;
	build: () => Analytics<TEvents, TAdapters>;
};
