export type Primitive = string | number | boolean | null;
export type Value = Primitive | Value[] | { [key: string]: Value | undefined };
export type Properties = Record<string, Value | undefined>;
export type Context = Record<string, Value | undefined>;
export type Traits = Record<string, Value | undefined>;

export type EventMap = Record<string, Properties>;

export type EventKind = "track" | "page" | "identify";

export type AnalyticsEvent = {
	kind: EventKind;
	name: string;
	properties: Properties;
	context: Context;
	userId?: string;
	timestamp: number;
};

export type Middleware = (event: AnalyticsEvent) => AnalyticsEvent | null;

export type RuntimeConfig = {
	app?: string;
	environment?: string;
	context: Context;
};

export type Adapter = {
	id: string;
	init?: (config: RuntimeConfig) => void | Promise<void>;
	track?: (event: AnalyticsEvent) => void | Promise<void>;
	page?: (event: AnalyticsEvent) => void | Promise<void>;
	identify?: (event: AnalyticsEvent) => void | Promise<void>;
	reset?: () => void | Promise<void>;
	flush?: () => void | Promise<void>;
	destroy?: () => void | Promise<void>;
	expose?: () => unknown;
};

export type AdapterBuilder = {
	build: () => Adapter;
};

export type AdapterSource = Adapter | AdapterBuilder;

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

export type ScopedEvents<
	TEvents extends EventMap,
	TScope extends string,
> = string extends keyof TEvents
	? EventMap
	: {
			[Key in keyof TEvents as Key extends `${TScope}.${infer Rest}` ? Rest : never]: TEvents[Key];
		};

export type EventDraft<TProperties extends Properties> = {
	property: <TKey extends keyof TProperties & string>(
		key: TKey,
		value: TProperties[TKey],
	) => EventDraft<TProperties>;
	properties: (values: Partial<TProperties>) => EventDraft<TProperties>;
	context: (values: Context) => EventDraft<TProperties>;
	to: (...adapters: string[]) => EventDraft<TProperties>;
	except: (...adapters: string[]) => EventDraft<TProperties>;
	send: () => Promise<SendResult[]>;
};

export type Analytics<TEvents extends EventMap = EventMap> = {
	track: <TName extends keyof TEvents & string>(
		name: TName,
		properties?: TEvents[TName],
	) => Promise<SendResult[]>;
	event: <TName extends keyof TEvents & string>(name: TName) => EventDraft<TEvents[TName]>;
	page: (properties?: Properties) => Promise<SendResult[]>;
	identify: (userId: string, traits?: Traits) => Promise<SendResult[]>;
	reset: () => Promise<void>;
	with: (context: Context) => Analytics<TEvents>;
	scope: <TScope extends string>(name: TScope) => Analytics<ScopedEvents<TEvents, TScope>>;
	provider: <TProvider = unknown>(id: string) => TProvider | undefined;
	flush: () => Promise<void>;
	destroy: () => Promise<void>;
};

export type Builder<TEvents extends EventMap = EventMap> = {
	app: (name: string) => Builder<TEvents>;
	environment: (name: string) => Builder<TEvents>;
	context: (value: ContextInput) => Builder<TEvents>;
	use: (adapter: AdapterSource) => Builder<TEvents>;
	when: (condition: boolean | (() => boolean), adapter: AdapterSource) => Builder<TEvents>;
	pipe: (middleware: Middleware) => Builder<TEvents>;
	build: () => Analytics<TEvents>;
};
