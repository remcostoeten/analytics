import { noop } from "@remcostoeten/analytics-shared/noop";
import type { ID, Nullable } from "@remcostoeten/analytics-shared/semantic";

import { createClient } from "../client/client";
import type { Client } from "../client/client";
import { openStream } from "../client/stream";
import type { Stream, StreamState } from "../client/stream";
import type {
  Bootstrap,
  ClientReport,
  Issue,
  IssueEvent,
  JsonValue,
  LiveEvent,
  LiveSession,
  LogEntry,
  OnlineVisitor,
  Overview,
  SpeedRoute,
  VisitorDetail,
} from "../client/types";
import type { DevtoolsOptions } from "../options";
import { createStore } from "../store/create-store";
import type { Store } from "../store/create-store";
import { emptyList, listReducer } from "../store/list";
import type { ListAction, ListState } from "../store/list";

export type SpeedRow = SpeedRoute & { id: ID };

export type IssueDetail = {
  events: IssueEvent[];
};

export type ListStore<Item extends { id: ID }, Detail> = Store<
  ListState<Item, Detail>,
  ListAction<Item, Detail>
>;

export type LiveState = {
  overview: Nullable<Overview>;
  logs: StreamState;
  events: StreamState;
  seen: number[];
  open: boolean;
};

export type LiveAction =
  | { type: "overview"; overview: Overview }
  | { type: "stream"; name: "logs" | "events"; state: StreamState }
  | { type: "seen"; at: number[]; now: number }
  | { type: "open"; open: boolean };

export type Runtime = {
  bootstrap: Bootstrap;
  options: DevtoolsOptions;
  client: Client;
  visitors: ListStore<OnlineVisitor, VisitorDetail>;
  sessions: ListStore<LiveSession, never>;
  logs: ListStore<LogEntry, never>;
  speed: ListStore<SpeedRow, never>;
  errors: ListStore<Issue, IssueDetail>;
  live: Store<LiveState, LiveAction>;
  setOpen: (open: boolean) => void;
  holdLogs: (held: boolean) => void;
  setLogPath: (path: Nullable<string>) => void;
  loadVisitor: (id: ID) => void;
  loadIssue: (id: ID) => void;
  refresh: () => void;
  stop: () => void;
};

const minuteMs = 60_000;
const reportBatch = 50;

export type Timing = {
  open: number;
  closed: number;
  slow: number;
  report: number;
};

export const timing: Timing = { open: 10_000, closed: 30_000, slow: 60_000, report: 5000 };

function liveReducer(state: LiveState, action: LiveAction): LiveState {
  switch (action.type) {
    case "overview":
      return { ...state, overview: action.overview };
    case "stream":
      return state[action.name] === action.state
        ? state
        : { ...state, [action.name]: action.state };
    case "seen": {
      const seen = [...state.seen, ...action.at].filter((at) => action.now - at < minuteMs);
      return { ...state, seen };
    }
    case "open":
      return state.open === action.open ? state : { ...state, open: action.open };
  }
}

function list<Item extends { id: ID }, Detail>(): ListStore<Item, Detail> {
  return createStore<ListState<Item, Detail>, ListAction<Item, Detail>>(
    listReducer,
    emptyList<Item, Detail>(),
  );
}

function toJson<Value>(value: Value): JsonValue {
  const parsed: JsonValue = JSON.parse(JSON.stringify(value));
  return parsed;
}

function newestFirst(rows: LogEntry[]): LogEntry[] {
  return rows
    .map((row, index) => ({ row, index, at: Date.parse(row.at) }))
    .sort((left, right) => right.at - left.at || left.index - right.index)
    .map((entry) => entry.row);
}

/**
 * @name createRuntime
 * @description Everything the panel reads, wired to the API: one store per buffer, the log
 * and live event streams, polling for lists and the overview (every 10 seconds while open, 30
 * while collapsed), and the SDK's `drop` and `error` outcomes when an SDK client is passed in,
 * posted to `logs/client` in batches when the project has `widgetReports` on.
 *
 * @example
 * const runtime = createRuntime(bootstrap, options);
 * runtime.setOpen(true);
 * runtime.stop();
 */
export function createRuntime(
  bootstrap: Bootstrap,
  options: DevtoolsOptions,
  pace: Timing = timing,
): Runtime {
  const client = createClient(
    { endpoint: options.endpoint, project: options.project, fetch: options.fetch },
    bootstrap,
  );
  const visitors = list<OnlineVisitor, VisitorDetail>();
  const sessions = list<LiveSession, never>();
  const logs = list<LogEntry, never>();
  const speed = list<SpeedRow, never>();
  const errors = list<Issue, IssueDetail>();
  const live = createStore<LiveState, LiveAction>(liveReducer, {
    overview: null,
    logs: "connecting",
    events: "connecting",
    seen: [],
    open: false,
  });
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const cleanups: (() => void)[] = [];
  const reports: ClientReport[] = [];
  let logPath: Nullable<string> = null;
  let stopped = false;
  let counter = 0;

  function visible() {
    return document.visibilityState !== "hidden";
  }

  function every(task: () => Promise<void>, delay: () => number) {
    async function tick() {
      if (stopped) return;
      if (visible()) await task().catch(noop);
      if (stopped) return;
      const timer = setTimeout(() => {
        timers.delete(timer);
        void tick();
      }, delay());
      timers.add(timer);
    }
    void tick();
  }

  async function loadOverview() {
    const answer = await client.overview();
    if (answer.ok) live.dispatch({ type: "overview", overview: answer.value.data });
  }

  async function loadLists() {
    if (!live.get().open) return;
    const [people, visits] = await Promise.all([client.visitors(), client.sessions()]);
    if (people.ok) visitors.dispatch({ type: "replace", rows: people.value.data });
    if (visits.ok) sessions.dispatch({ type: "replace", rows: visits.value.data });
  }

  async function loadSlow() {
    if (!live.get().open) return;
    const [routes, issues] = await Promise.all([client.speed(), client.issues()]);
    if (routes.ok) {
      speed.dispatch({
        type: "replace",
        rows: routes.value.data.map((route) => ({ ...route, id: route.route })),
      });
    }
    if (issues.ok) errors.dispatch({ type: "replace", rows: issues.value.data });
  }

  function projectUrl(route: string, cursor: Nullable<string>, path: Nullable<string>) {
    const url = new URL(
      `${client.base()}/v2/projects/${encodeURIComponent(options.project)}/${route}`,
    );
    if (cursor) url.searchParams.set("after", cursor);
    if (path) url.searchParams.set("q", path);
    return url.toString();
  }

  function addLogs(items: LogEntry[]) {
    logs.dispatch({ type: "replace", rows: newestFirst([...items, ...logs.get().rows]) });
  }

  function openLogs(): Stream {
    return openStream<LogEntry>({
      url: (cursor) => projectUrl("logs", cursor, logPath),
      token: client.token,
      fetch: options.fetch,
      onItems: (items) => addLogs(items),
      onState: (state) => live.dispatch({ type: "stream", name: "logs", state }),
    });
  }

  let logStream = openLogs();
  const eventStream = openStream<LiveEvent>({
    url: (cursor) => projectUrl("realtime/events", cursor, null),
    token: client.token,
    fetch: options.fetch,
    onItems: (items) => {
      const now = Date.now();
      const views = items.filter((item) => item.name === "pageview");
      live.dispatch({ type: "seen", at: views.map((item) => Date.parse(item.ts)), now });
    },
    onState: (state) => live.dispatch({ type: "stream", name: "events", state }),
  });

  function pushLocal(
    entry: Omit<LogEntry, "id" | "at" | "visitor" | "path">,
    report: ClientReport,
  ) {
    counter += 1;
    addLogs([
      {
        ...entry,
        id: `sdk_${Date.now()}_${counter}`,
        at: report.at,
        visitor: null,
        path: report.path,
      },
    ]);
    if (bootstrap.widgetReports) reports.push(report);
  }

  if (options.analytics) {
    cleanups.push(
      options.analytics.on("drop", (event, reason) => {
        const at = new Date().toISOString();
        const message = `${event.name} dropped before send, reason ${reason}`;
        pushLocal(
          {
            level: "info",
            outcome: "dropped",
            kind: "pipeline",
            source: "sdk",
            message,
            code: null,
            data: toJson(event),
          },
          { at, outcome: "dropped", code: reason, message, path: location.pathname },
        );
      }),
      options.analytics.on("error", (code, detail) => {
        const at = new Date().toISOString();
        const message = `${code} ${detail}`;
        pushLocal(
          {
            level: "error",
            outcome: "rejected",
            kind: "transport",
            source: "sdk",
            message,
            code,
            data: { code, detail },
          },
          { at, outcome: "error", code, message, path: location.pathname },
        );
      }),
    );
  }

  every(loadOverview, () => (live.get().open ? pace.open : pace.closed));
  every(loadLists, () => pace.open);
  every(loadSlow, () => pace.slow);
  every(
    async () => {
      if (reports.length === 0) return;
      const batch = reports.splice(0, reportBatch);
      await client.report(batch);
    },
    () => pace.report,
  );

  function refresh() {
    void loadOverview();
    void loadLists();
    void loadSlow();
  }

  return {
    bootstrap,
    options,
    client,
    visitors,
    sessions,
    logs,
    speed,
    errors,
    live,
    setOpen: (open) => {
      const was = live.get().open;
      live.dispatch({ type: "open", open });
      if (open && !was) refresh();
    },
    holdLogs: (held) => {
      logs.dispatch({ type: "hold", held });
      if (held) logStream.pause();
      else logStream.resume();
    },
    setLogPath: (path) => {
      if (path === logPath) return;
      logPath = path;
      logStream.stop();
      logStream = openLogs();
    },
    loadVisitor: (id) => {
      if (visitors.get().details[id]) return;
      void client.visitor(id).then((answer) => {
        if (answer.ok) visitors.dispatch({ type: "detail", id, detail: answer.value.data });
      });
    },
    loadIssue: (id) => {
      if (errors.get().details[id]) return;
      void client.issueEvents(id).then((answer) => {
        if (answer.ok) {
          errors.dispatch({ type: "detail", id, detail: { events: answer.value.data } });
        }
      });
    },
    refresh,
    stop: () => {
      stopped = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
      logStream.stop();
      eventStream.stop();
      for (const cleanup of cleanups) cleanup();
    },
  };
}
