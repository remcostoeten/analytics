import type { IngestResult, PropValue, WireEvent } from "@remcostoeten/analytics-contract";

export type Props = { [key: string]: PropValue };
export type NoProps = Record<never, never>;
export type EventMap = { [name: string]: Props };
export type EventName<Events extends EventMap> = Extract<keyof Events, string>;
export type PropsArgs<
  Events extends EventMap,
  Name extends EventName<Events>,
> = string extends keyof Events
  ? [props?: Props]
  : [keyof Events[Name]] extends [never]
    ? []
    : [props: Events[Name]];

export type ConsentMode = "optional" | "required";
export type ConsentStatus = "granted" | "denied" | "unset";
export type Mode = "auto" | "development" | "production";
export type Level = "error" | "warning" | "info";

export type Envelope = {
  v: 1;
  sentAt: string;
  events: WireEvent[];
};

export type SendResult =
  | { ok: true; result: IngestResult }
  | { ok: false; retry: boolean; status: number };

export type Transport = {
  send: (envelope: Envelope, unloading: boolean) => Promise<SendResult>;
};

export type BeforeSend = (event: WireEvent) => WireEvent | null;

export type Hooks = {
  beforeSend: (fn: BeforeSend) => () => void;
  onPage: (fn: () => void) => () => void;
  onHidden: (fn: () => void) => () => void;
  onConsent: (fn: (status: ConsentStatus) => void) => () => void;
};

export type Plugin = {
  name: string;
  setup: (client: PluginClient) => () => void;
};

export type Status = {
  queued: number;
  consent: ConsentStatus;
  endpoint: string;
  lastError: string | null;
  lastSend: string | null;
};

export type FlushResult = {
  accepted: number;
  duplicates: number;
  failed: number;
};

export type Listener = "error" | "send" | "drop";

export type Handlers = {
  error: (code: string, detail: string) => void;
  send: (envelope: Envelope) => void;
  drop: (event: WireEvent, reason: string) => void;
};

export type ErrorContext = {
  level?: Level;
  tags?: Props;
  fingerprint?: string;
};

export type AnalyticsConfig = {
  project: string;
  key: string;
  endpoint?: string;
  consent?: ConsentMode;
  plugins?: Plugin[];
  pageviews?: boolean;
  mode?: Mode;
  debug?: boolean;
  release?: string;
  environment?: string;
  beforeSend?: BeforeSend;
  autostart?: boolean;
  transport?: Transport;
};

export type Consent = {
  grant: () => void;
  revoke: () => void;
  status: () => ConsentStatus;
};

export type Analytics<Events extends EventMap = EventMap> = {
  track: <Name extends EventName<Events>>(name: Name, ...args: PropsArgs<Events, Name>) => void;
  page: (props?: Props) => void;
  identify: (userId: string, traits?: Props) => void;
  register: (props: Props) => void;
  captureError: (error: unknown, context?: ErrorContext) => void;
  captureMessage: (message: string, context?: ErrorContext) => void;
  scope: (tags: Props) => Analytics<Events>;
  use: (plugin: Plugin) => () => void;
  consent: Consent;
  optOut: () => void;
  optIn: () => void;
  isOptedOut: () => boolean;
  reset: () => void;
  flush: () => Promise<FlushResult>;
  shutdown: () => Promise<void>;
  on: <Name extends Listener>(name: Name, handler: Handlers[Name]) => () => void;
  status: () => Status;
  route: (template: string | null) => void;
};

export type PluginClient = Analytics & Hooks;
