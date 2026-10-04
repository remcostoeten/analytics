import { LiveClientMessage } from "@spoar/contract";
import type { LiveChannel, LiveServerMessage } from "@spoar/contract";
import { engineError } from "@spoar/engine";
import type { EngineError } from "@spoar/engine";
import type { Nullable } from "@spoar/shared/semantic";
import { Value } from "@sinclair/typebox/value";

import { decide } from "../../access/decide";
import { canAdmin, canReadDetail } from "../../access/rules";
import type { AccessDeps } from "../../access/types";
import type { createHub } from "./hub";

type Hub = ReturnType<typeof createHub>;

export type Connection = {
  id: string;
  project: string;
  send: (message: LiveServerMessage) => void;
  close: (code: number, reason: string) => void;
};

export type LiveDeps = {
  access: AccessDeps;
  hub: Hub;
  authMs: number;
};

type Granted = {
  channels: Set<LiveChannel>;
  detailed: boolean;
};

const closeCodes = { unauthorized: 4401, expired: 4001 } as const;

// setTimeout keeps delays in a signed 32-bit integer of milliseconds.
const maxDelayMs = 2_147_483_647;

function problem(error: EngineError, channel: Nullable<LiveChannel>): LiveServerMessage {
  return channel
    ? { type: "error", code: error.code, message: error.message, channel }
    : { type: "error", code: error.code, message: error.message };
}

function parse(text: string): Nullable<LiveClientMessage> {
  try {
    const value: unknown = JSON.parse(text);
    return Value.Check(LiveClientMessage, value) ? value : null;
  } catch {
    return null;
  }
}

async function tokenExpiry(token: string, deps: AccessDeps): Promise<Nullable<Date>> {
  const found = await deps.tokens.byHash(await deps.hasher.sha256(token));
  return found.ok ? (found.value?.expiresAt ?? null) : null;
}

/**
 * @name openLive
 * @description One WebSocket connection to `/v2/projects/:project/live`. The first message must
 * be `{ type: "auth", token }` with an API token or a widget token, within `authMs`, else the
 * socket closes with 4401. The token's access decides the channels: `events` for anyone who may
 * read the project, `visitors` and `sessions` with `detail` access, `logs` with `admin` access.
 * After `ready`, `subscribe` joins a channel on the hub, optionally from an `after` cursor, and
 * `unsubscribe` leaves it; `ping` answers `pong`. A malformed message answers an `error` and
 * keeps the socket open. The socket closes with 4001 when its token expires, so the widget
 * fetches a new token and reconnects.
 *
 * @example
 * const live = openLive({ id: ws.id, project: "docs", send, close }, deps);
 * await live.receive('{"type":"auth","token":"wt_..."}');
 */
export function openLive(connection: Connection, deps: LiveDeps) {
  let granted: Nullable<Granted> = null;
  let expiry: Nullable<ReturnType<typeof setTimeout>> = null;
  const deadline = setTimeout(() => {
    if (!granted) connection.close(closeCodes.unauthorized, "Send auth first");
  }, deps.authMs);

  async function authenticate(token: string) {
    const headers = new Headers({ authorization: `Bearer ${token}` });
    const decision = await decide("project", headers, connection.project, deps.access);
    if (!decision.ok || !decision.value.project) {
      const error = decision.ok ? engineError("NOT_FOUND", "Project not found") : decision.error;
      connection.send(problem(error, null));
      connection.close(closeCodes.unauthorized, error.message);
      return;
    }
    const { caller, project } = decision.value;
    const detailed = canReadDetail(caller, project);
    const channels = new Set<LiveChannel>(["events"]);
    if (detailed) {
      channels.add("visitors");
      channels.add("sessions");
    }
    if (canAdmin(caller, project.id)) channels.add("logs");
    granted = { channels, detailed };
    clearTimeout(deadline);
    const expiresAt = caller.kind === "token" ? await tokenExpiry(token, deps.access) : null;
    if (expiresAt) {
      const left = Math.min(
        maxDelayMs,
        Math.max(0, expiresAt.getTime() - deps.access.clock().getTime()),
      );
      expiry = setTimeout(() => connection.close(closeCodes.expired, "The token expired"), left);
    }
    connection.send({
      type: "ready",
      project: project.id,
      channels: [...channels],
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
    });
  }

  async function subscribe(channel: LiveChannel, after: Nullable<string>) {
    if (!granted) {
      connection.send(problem(engineError("UNAUTHORIZED", "Send auth first"), channel));
      return;
    }
    if (!granted.channels.has(channel)) {
      const level = channel === "logs" ? "admin" : "detail";
      connection.send(
        problem(engineError("FORBIDDEN", `The ${channel} channel needs ${level} access`), channel),
      );
      return;
    }
    deps.hub.leave(connection.id, channel);
    connection.send({ type: "subscribed", channel });
    await deps.hub.join({
      id: connection.id,
      project: connection.project,
      channel,
      detailed: granted.detailed,
      after,
      send: connection.send,
    });
  }

  async function receive(text: string) {
    const message = parse(text);
    if (!message) {
      connection.send(problem(engineError("VALIDATION_FAILED", "Not a valid live message"), null));
      return;
    }
    if (message.type === "ping") {
      connection.send({ type: "pong" });
      return;
    }
    if (message.type === "auth") {
      if (granted) return;
      await authenticate(message.token);
      return;
    }
    if (message.type === "unsubscribe") {
      deps.hub.leave(connection.id, message.channel);
      return;
    }
    await subscribe(message.channel, message.after ?? null);
  }

  function end() {
    clearTimeout(deadline);
    if (expiry) clearTimeout(expiry);
    deps.hub.leave(connection.id, null);
  }

  return { receive, end };
}
