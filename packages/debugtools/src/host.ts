import type { WireEvent } from "@spoar/contract";
import type { Nullable } from "@spoar/shared/semantic";

export type HostListeners = {
  error: (code: string, detail: string, event?: WireEvent) => void;
  send: (envelope: { events: WireEvent[] }) => void;
  drop: (event: WireEvent, reason: string) => void;
};

export type HostListener = keyof HostListeners;

export type HostStatus = {
  queued: number;
  consent: string;
  endpoint: string;
  lastError: Nullable<string>;
  lastSend: Nullable<string>;
};

export type ConsoleHost = {
  on: <Name extends HostListener>(name: Name, handler: HostListeners[Name]) => () => void;
  optOut: () => void;
  optIn: () => void;
  isOptedOut: () => boolean;
  status: () => HostStatus;
};
