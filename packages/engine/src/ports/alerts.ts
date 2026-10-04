import type { AlertEvent, AlertEventName, ChannelName, DeliveryStatus } from "@spoar/contract";
import type { Result } from "@spoar/shared/result";
import type { ID, Nullable, ProjectID } from "@spoar/shared/semantic";

import type { EngineError } from "../errors";
import type { Offset } from "./details";

type Read<Value> = Promise<Result<Value, EngineError>>;

export type TargetSettings = {
  mail: { to: string[] };
  webhook: { url: string };
  discord: { url: string };
};

export type TargetSpec<Name extends ChannelName = ChannelName> = {
  [Channel in Name]: {
    name: string;
    channel: Channel;
    on: AlertEventName[];
    enabled: boolean;
    settings: TargetSettings[Channel];
  };
}[Name];

export type TargetRecord<Name extends ChannelName = ChannelName> = {
  [Channel in Name]: TargetSpec<Channel> & {
    id: ID;
    projectId: ProjectID;
    secret: Nullable<string>;
    failure: Nullable<string>;
    createdAt: Date;
    updatedAt: Date;
  };
}[Name];

export type QueuedEvent = { event: AlertEvent; subject: string };

export type DeliveryRecord = {
  id: ID;
  targetId: ID;
  target: string;
  channel: ChannelName;
  event: AlertEvent;
  subject: string;
  status: DeliveryStatus;
  attempts: number;
  nextAttemptAt: Nullable<Date>;
  lastError: Nullable<string>;
  sentAt: Nullable<Date>;
  createdAt: Date;
};

export type DeliveryBatch<Name extends ChannelName = ChannelName> = {
  target: TargetRecord<Name>;
  deliveries: DeliveryRecord[];
};

export type DeliveryOutcome = {
  id: ID;
  status: DeliveryStatus;
  attempts: number;
  nextAttemptAt: Nullable<Date>;
  error: Nullable<string>;
  at: Date;
};

export type TargetChanges = {
  created: string[];
  updated: string[];
  removed: string[];
  secrets: { [name: string]: string };
};

export type FailingTarget = {
  projectId: ProjectID;
  name: string;
  channel: ChannelName;
  reason: Nullable<string>;
};

export type AlertStore = {
  targets: (project: ProjectID) => Read<TargetRecord[]>;
  target: (project: ProjectID, name: string) => Read<Nullable<TargetRecord>>;
  syncTargets: (project: ProjectID, targets: TargetSpec[]) => Read<TargetChanges>;
  saveTarget: (project: ProjectID, target: TargetSpec) => Read<TargetChanges>;
  removeTarget: (project: ProjectID, name: string) => Read<boolean>;
  rotateSecret: (project: ProjectID, name: string) => Read<Nullable<string>>;
  subscribed: (event: AlertEventName, channels: ChannelName[]) => Read<ProjectID[]>;
  queue: (events: QueuedEvent[], channels: ChannelName[], now: Date) => Read<{ queued: number }>;
  due: (now: Date, limit: number) => Read<DeliveryBatch[]>;
  settle: (outcomes: DeliveryOutcome[]) => Read<null>;
  deliveries: (
    project: ProjectID,
    status: Nullable<DeliveryStatus>,
    page: Offset,
  ) => Read<{ rows: DeliveryRecord[]; total: number }>;
  pending: () => Read<number>;
  failing: () => Read<FailingTarget[]>;
};
