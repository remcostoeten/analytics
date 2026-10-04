import { ok } from "@spoar/shared/result";
import { Elysia } from "elysia";

import type { AccessDeps } from "../../access/types";
import { logLines, logQuery } from "../logs/service";
import type { ReadsOptions } from "../reads/guard";
import { liveEvents, liveQuery } from "../reads/live";
import { activeVisitors, liveSessions } from "../widget/service";
import type { WidgetDeps } from "../widget/service";
import { createHub } from "./hub";
import type { HubSources } from "./hub";
import { openLive } from "./service";

export type LiveOptions = {
  snapshotMs: number;
  retryMs: number;
  authMs: number;
};

function hubSources(reads: ReadsOptions, widget: WidgetDeps): HubSources {
  return {
    events: async (project, detailed, after, wait) => {
      const query = liveQuery(new URLSearchParams(), [project], after);
      if (!query.ok) return query;
      const page = await liveEvents(
        reads.feed,
        query.value,
        new Set(detailed ? [project] : []),
        wait,
      );
      return page.ok ? ok({ data: page.value.data, cursor: page.value.nextCursor }) : page;
    },
    logs: async (project, after, wait) => {
      const query = logQuery(new URLSearchParams(), project, after);
      if (!query.ok) return query;
      const page = await logLines(widget.logs, query.value, wait);
      return page.ok ? ok({ data: page.value.data, cursor: page.value.nextCursor }) : page;
    },
    visitors: async (project) => {
      const found = await activeVisitors(
        widget.store,
        project,
        new URLSearchParams(),
        reads.clock(),
      );
      return found.ok ? ok(found.value.data) : found;
    },
    sessions: async (project) => {
      const found = await liveSessions(widget.store, project, new URLSearchParams(), reads.clock());
      return found.ok ? ok(found.value.data) : found;
    },
  };
}

function text(message: unknown) {
  return typeof message === "string" ? message : JSON.stringify(message);
}

/**
 * @name liveModule
 * @description `GET /v2/projects/:project/live`, the dev widget's WebSocket. After an `auth`
 * message the client subscribes to `events`, `logs`, `visitors` and `sessions` as its access
 * allows, and receives each new batch or changed snapshot as a JSON message. Every connection on
 * an instance shares one poller per project and channel through the hub; Postgres stays the only
 * source of truth, so a reconnect to another instance or deployment resumes from its cursor.
 *
 * @example
 * app.use(liveModule(deps, reads, widget, { snapshotMs: 5_000, retryMs: 2_000, authMs: 10_000 }));
 */
export function liveModule(
  deps: AccessDeps,
  reads: ReadsOptions,
  widget: WidgetDeps,
  options: LiveOptions,
) {
  const hub = createHub(hubSources(reads, widget), {
    waitMs: reads.live.waitMs,
    snapshotMs: options.snapshotMs,
    retryMs: options.retryMs,
  });
  const connections = new Map<string, ReturnType<typeof openLive>>();

  return new Elysia({ name: "live" }).ws("/projects/:project/live", {
    open(ws) {
      const live = openLive(
        {
          id: ws.id,
          project: ws.data.params.project,
          send: (message) => ws.send(JSON.stringify(message)),
          close: (code, reason) => ws.close(code, reason),
        },
        { access: deps, hub, authMs: options.authMs },
      );
      connections.set(ws.id, live);
    },
    async message(ws, message) {
      await connections.get(ws.id)?.receive(text(message));
    },
    close(ws) {
      connections.get(ws.id)?.end();
      connections.delete(ws.id);
    },
    detail: {
      summary: "Live updates over a WebSocket",
      description:
        'WebSocket. Upgrade with `GET` and send `{ "type": "auth", "token": "wt_..." }` first. Then `subscribe` to `events`, `logs`, `visitors` or `sessions`, optionally with an `after` cursor to resume. Messages are JSON; see the Dev widget section of the API reference for the protocol.',
      tags: ["Dev widget"],
    },
  });
}
