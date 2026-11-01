import { useMemo, useState, useSyncExternalStore } from "react";

import type { ConsoleHost } from "../host";
import { RejectsView } from "../live/rejects-view";
import type { ViewContext } from "../widget/view";
import { rejectionCode, sharedEventLog } from "./event-log";
import type { EventEntry, EventLog } from "./event-log";
import { rejectsSource } from "./rejects-source";

type Props = { context: ViewContext };

type Pane = "session" | "server";

const paneLabels: { [Key in Pane]: string } = {
  session: "This session",
  server: "Server rejects",
};

const switchClass =
  "rounded px-2 py-0.5 text-console-dim hover:text-console-fg aria-pressed:bg-console-raised aria-pressed:text-console-fg";
const toolButtonClass =
  "rounded border border-console-edge px-2 py-0.5 text-console-dim hover:border-console-edge-hover hover:text-console-fg disabled:opacity-50";
const messageClass = "flex flex-col gap-1.5 px-4 py-6 text-console-dim";
const chipBase = "inline-flex max-w-full truncate rounded px-1.5 py-px text-[11px] leading-4";
const chipClass: { [Status in EventEntry["status"]]: string } = {
  accepted: `${chipBase} bg-console-raised text-console-muted`,
  rejected: `${chipBase} bg-console-raised text-console-accent`,
  dropped: `${chipBase} bg-console-raised text-console-dim`,
  failed: `${chipBase} bg-console-raised text-console-accent`,
};

function time(at: string) {
  return new Date(at).toLocaleTimeString("en", { hour12: false });
}

function chipText(entry: EventEntry) {
  if (entry.status === "accepted") return "accepted";
  if (entry.status === "rejected") return `rejected ${rejectionCode(entry.reason ?? "")}`.trim();
  return `${entry.status} ${entry.reason ?? ""}`.trim();
}

function details(entry: EventEntry) {
  if (!entry.event) return entry.reason ?? "";
  const { props, context, page } = entry.event;
  return JSON.stringify({ props, context, page }, null, 2);
}

function matches(entry: EventEntry, filter: string) {
  if (!filter) return true;
  return entry.event?.name.toLowerCase().includes(filter.toLowerCase()) ?? false;
}

function EntryRow({ entry }: { entry: EventEntry }) {
  const [open, setOpen] = useState(false);
  const name = entry.event?.name ?? (entry.status === "failed" ? "send failed" : "rejected");
  return (
    <li className="border-b border-console-divider">
      <button
        type="button"
        aria-expanded={open}
        className="grid w-full grid-cols-[4.5rem_minmax(6rem,12rem)_1fr_auto] items-center gap-3 px-3 py-1.5 text-left hover:bg-console-hover"
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-console-dim">{time(entry.at)}</span>
        <span className="truncate text-console-fg">{name}</span>
        <span className="truncate text-console-dim">{entry.event?.page.path ?? "–"}</span>
        <span className={chipClass[entry.status]} title={entry.reason ?? undefined}>
          {chipText(entry)}
        </span>
      </button>
      {open ? (
        <pre className="overflow-auto bg-console-surface px-3 py-2 whitespace-pre-wrap text-console-muted">
          {details(entry)}
        </pre>
      ) : null}
    </li>
  );
}

function Empty({ host }: { host: ConsoleHost }) {
  const status = host.status();
  const idle = status.lastSend === null && status.queued === 0;
  return (
    <div className={messageClass}>
      <p className="text-console-fg">No events yet.</p>
      <p>Only events the SDK handles after this tab first opened show up here.</p>
      {idle ? (
        <p>
          The SDK has not sent anything yet. In development mode it logs events to the browser
          console and sends nothing, so none show up here.
        </p>
      ) : null}
      <p className="font-console-mono">
        Endpoint {status.endpoint}, last send {status.lastSend ? time(status.lastSend) : "never"},{" "}
        {status.queued} queued{status.lastError ? `, last error ${status.lastError}` : ""}
      </p>
    </div>
  );
}

function NoHost() {
  return (
    <div className={messageClass} role="note">
      <p className="text-console-fg">The page's SDK did not hand the console a client.</p>
      <p>
        Render{" "}
        <code className="font-console-mono text-console-fg">{"<Analytics debugConsole />"}</code>{" "}
        from <code className="font-console-mono">@spoar/sdk/next</code>, or pass the client with{" "}
        <code className="font-console-mono text-console-fg">{"mount({ host })"}</code>, to see the
        events this page sends.
      </p>
    </div>
  );
}

function SessionLog({ host, log }: { host: ConsoleHost; log: EventLog }) {
  const entries = useSyncExternalStore(log.subscribe, log.read, log.read);
  const [filter, setFilter] = useState("");
  const shown = entries.filter((entry) => matches(entry, filter.trim()));
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-8 flex-none items-center gap-2 border-b border-console-divider px-3">
        <input
          type="search"
          value={filter}
          placeholder="Filter by event name"
          aria-label="Filter by event name"
          className="h-6 min-w-0 flex-1 rounded border border-console-edge bg-console-bg px-2 text-console-fg placeholder:text-console-faint focus:border-console-edge-hover focus:outline-none"
          onChange={(event) => setFilter(event.currentTarget.value)}
        />
        <span className="text-console-dim">
          {shown.length} of {entries.length}
        </span>
        <button
          type="button"
          className={toolButtonClass}
          disabled={entries.length === 0}
          onClick={log.clear}
        >
          Clear
        </button>
      </div>
      {entries.length === 0 ? <Empty host={host} /> : null}
      {entries.length > 0 && shown.length === 0 ? (
        <p className={messageClass}>No events match "{filter.trim()}".</p>
      ) : null}
      {shown.length > 0 ? (
        <ul className="min-h-0 flex-1 overflow-auto font-console-mono">
          {shown.map((entry) => (
            <EntryRow key={entry.key} entry={entry} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function EventsView({ context }: Props) {
  const [pane, setPane] = useState<Pane>("session");
  const { host, client, project } = context;
  const log = useMemo(() => (host ? sharedEventLog(host) : null), [host]);
  const source = useMemo(() => rejectsSource({ client, project }), [client, project]);
  return (
    <div className="flex h-full flex-col font-console-sans text-xs">
      <div
        className="flex h-8 flex-none items-center gap-1 border-b border-console-divider px-2"
        role="group"
        aria-label="Event views"
      >
        {(["session", "server"] as const).map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={pane === item}
            className={switchClass}
            onClick={() => setPane(item)}
          >
            {paneLabels[item]}
          </button>
        ))}
      </div>
      {pane === "server" ? <RejectsView source={source} /> : null}
      {pane === "session" && host && log ? <SessionLog host={host} log={log} /> : null}
      {pane === "session" && !host ? <NoHost /> : null}
    </div>
  );
}
