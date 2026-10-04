import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

import { ErrorCode } from "./errors";
import { Id, oneOf } from "./schema";
import { LiveEvent } from "./stats";
import { ActiveVisitor, LiveSession, LogLine } from "./widget";

export const LiveChannel = oneOf(["events", "logs", "visitors", "sessions"], {
  description:
    "`events` needs read access to the project, `visitors` and `sessions` need visitor-level access, `logs` needs admin access.",
});
export type LiveChannel = Static<typeof LiveChannel>;

const Cursor = Type.String({ minLength: 1, maxLength: 512 });

export const LiveAuth = Type.Object({
  type: Type.Literal("auth"),
  token: Type.String({
    minLength: 1,
    maxLength: 256,
    description: "An API token or a widget token; send it first, within the auth timeout.",
  }),
});
export type LiveAuth = Static<typeof LiveAuth>;

export const LiveSubscribe = Type.Object({
  type: Type.Literal("subscribe"),
  channel: LiveChannel,
  after: Type.Optional(
    Type.String({
      minLength: 1,
      maxLength: 512,
      description: "Resume `events` or `logs` after this cursor.",
    }),
  ),
});
export type LiveSubscribe = Static<typeof LiveSubscribe>;

export const LiveUnsubscribe = Type.Object({
  type: Type.Literal("unsubscribe"),
  channel: LiveChannel,
});
export type LiveUnsubscribe = Static<typeof LiveUnsubscribe>;

export const LivePing = Type.Object({ type: Type.Literal("ping") });
export type LivePing = Static<typeof LivePing>;

export const LiveClientMessage = Type.Union([LiveAuth, LiveSubscribe, LiveUnsubscribe, LivePing]);
export type LiveClientMessage = Static<typeof LiveClientMessage>;

export const LiveReady = Type.Object({
  type: Type.Literal("ready"),
  project: Id,
  channels: Type.Array(LiveChannel),
  expiresAt: Type.Union([Type.String({ format: "date-time" }), Type.Null()], {
    description:
      "When the token expires and the socket closes with 4001; null for a token without expiry.",
  }),
});
export type LiveReady = Static<typeof LiveReady>;

export const LiveSubscribed = Type.Object({
  type: Type.Literal("subscribed"),
  channel: LiveChannel,
});
export type LiveSubscribed = Static<typeof LiveSubscribed>;

export const LiveEventsMessage = Type.Object({
  type: Type.Literal("events"),
  data: Type.Array(LiveEvent),
  cursor: Cursor,
});
export type LiveEventsMessage = Static<typeof LiveEventsMessage>;

export const LiveLogsMessage = Type.Object({
  type: Type.Literal("logs"),
  data: Type.Array(LogLine),
  cursor: Cursor,
});
export type LiveLogsMessage = Static<typeof LiveLogsMessage>;

export const LiveVisitorsMessage = Type.Object({
  type: Type.Literal("visitors"),
  data: Type.Array(ActiveVisitor),
});
export type LiveVisitorsMessage = Static<typeof LiveVisitorsMessage>;

export const LiveSessionsMessage = Type.Object({
  type: Type.Literal("sessions"),
  data: Type.Array(LiveSession),
});
export type LiveSessionsMessage = Static<typeof LiveSessionsMessage>;

export const LiveError = Type.Object({
  type: Type.Literal("error"),
  code: ErrorCode,
  message: Type.String(),
  channel: Type.Optional(LiveChannel),
});
export type LiveError = Static<typeof LiveError>;

export const LivePong = Type.Object({ type: Type.Literal("pong") });
export type LivePong = Static<typeof LivePong>;

export const LiveServerMessage = Type.Union([
  LiveReady,
  LiveSubscribed,
  LiveEventsMessage,
  LiveLogsMessage,
  LiveVisitorsMessage,
  LiveSessionsMessage,
  LiveError,
  LivePong,
]);
export type LiveServerMessage = Static<typeof LiveServerMessage>;
