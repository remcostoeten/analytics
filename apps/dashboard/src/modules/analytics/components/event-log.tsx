import type { ProjectScope } from "@spoar/client";
import type { EventRow } from "@spoar/contract";
import Link from "next/link";

import { formatDimensionValue } from "../format";
import { eventOutcome, logPageSize } from "../logs";
import { viewQuery } from "../view-state";
import type { ViewState } from "../view-state";
import { EmptyState } from "./empty-state";

type Props = {
  scope: ProjectScope;
  state: ViewState;
  path: string;
  base: string;
  cursor: string | undefined;
};

type FieldProps = { label: string; value: string | number | null | undefined };

function stamp(timestamp: string) {
  return timestamp.slice(0, 19).replace("T", " ");
}

function referrerHost(referrer: string | null) {
  if (!referrer) return null;
  try {
    return new URL(referrer).host;
  } catch {
    return referrer;
  }
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="log-field">
      <dt>{label}</dt>
      <dd>{value === null || value === undefined || value === "" ? "–" : String(value)}</dd>
    </div>
  );
}

function Detail({ row, base, state }: { row: EventRow; base: string; state: ViewState }) {
  const extra = { ...row.props, ...row.groups };
  return (
    <div className="log-detail">
      <dl className="log-fields">
        <Field label="Event id" value={row.id} />
        <Field label="Timestamp" value={row.ts} />
        <Field label="Path" value={row.page.path} />
        <Field label="Route" value={row.page.route} />
        <Field label="Title" value={row.page.title} />
        <Field label="Referrer" value={row.page.referrer} />
        <Field label="Country" value={row.geo.country} />
        <Field label="Region" value={row.geo.region} />
        <Field label="City" value={row.geo.city} />
        <Field label="Timezone" value={row.geo.timezone} />
        <Field label="Device" value={row.device.type} />
        <Field
          label="Browser"
          value={[row.device.browser, row.device.browserVersion].filter(Boolean).join(" ")}
        />
        <Field label="OS" value={[row.device.os, row.device.osVersion].filter(Boolean).join(" ")} />
        <Field label="Screen" value={row.device.screen} />
        <Field label="Viewport" value={row.device.viewport} />
        <Field label="Language" value={row.device.language} />
        <Field label="Bot score" value={row.bot.score} />
        <Field label="Bot reasons" value={row.bot.reasons.join(", ")} />
        <Field label="Internal" value={row.isInternal ? "yes" : "no"} />
      </dl>
      {Object.keys(extra).length > 0 ? (
        <pre className="log-json">{JSON.stringify(extra, null, 2)}</pre>
      ) : null}
      <div className="flex flex-wrap gap-3 text-xs">
        <Link
          href={`${base}/sessions/${encodeURIComponent(row.session)}${viewQuery(state)}`}
          className="text-link underline"
        >
          Open session
        </Link>
        <Link
          href={`${base}/visitors/${encodeURIComponent(row.visitor)}${viewQuery(state)}`}
          className="text-link underline"
        >
          Open visitor
        </Link>
      </div>
    </div>
  );
}

export async function EventLog({ scope, state, path, base, cursor }: Props) {
  const read = await scope.events({ limit: logPageSize, cursor });
  if (!read.ok) {
    return (
      <section className="panel-section">
        <p className="text-sm text-err">Could not read events: {read.error.message}</p>
      </section>
    );
  }
  const query = viewQuery(state);
  const rows = read.value.data;
  return (
    <section className="log" aria-label="Events">
      {rows.length === 0 ? (
        <div className="panel-section">
          <EmptyState title="No events in this range">
            Widen the time range, switch traffic or remove a filter.
          </EmptyState>
        </div>
      ) : (
        <div className="log-scroll">
          <div className="log-head" role="presentation">
            <span />
            <span>
              Timestamp <span className="text-muted">UTC</span>
            </span>
            <span>Event</span>
            <span>Path</span>
            <span>Referrer</span>
            <span>Country</span>
            <span>Browser</span>
            <span>OS</span>
            <span>Device</span>
            <span className="text-right">Bot</span>
          </div>
          {rows.map((row) => (
            <details key={row.id} className="log-row" data-outcome={eventOutcome(row)}>
              <summary className="log-line">
                <span className="log-chevron" aria-hidden="true" />
                <span className="font-mono">{stamp(row.ts)}</span>
                <span>
                  <span className="log-badge">{row.name}</span>
                </span>
                <span className="truncate font-mono" title={row.page.path}>
                  {row.page.path}
                </span>
                <span className="truncate font-mono text-muted">
                  {referrerHost(row.page.referrer) ?? "–"}
                </span>
                <span className="truncate">
                  {formatDimensionValue("country", row.geo.country ?? "")}
                </span>
                <span className="truncate">{row.device.browser ?? "–"}</span>
                <span className="truncate">{row.device.os ?? "–"}</span>
                <span className="truncate capitalize">{row.device.type}</span>
                <span className="text-right font-mono tabular-nums">{row.bot.score}</span>
              </summary>
              <Detail row={row} base={base} state={state} />
            </details>
          ))}
        </div>
      )}
      <footer className="log-foot">
        <span className="text-xs text-muted">
          {rows.length} {rows.length === 1 ? "event" : "events"}
          {cursor ? ", older page" : ", newest first"}
        </span>
        <span className="flex gap-2">
          {cursor ? (
            <Link href={`${path}${query}`} className="ghost-button">
              Newest
            </Link>
          ) : null}
          {read.value.nextCursor ? (
            <Link
              href={`${path}${query}${query ? "&" : "?"}cursor=${encodeURIComponent(read.value.nextCursor)}`}
              className="ghost-button"
            >
              Older events
            </Link>
          ) : null}
        </span>
      </footer>
    </section>
  );
}
