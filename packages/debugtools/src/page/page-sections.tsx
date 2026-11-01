import type { Nullable } from "@spoar/shared/semantic";
import type { ReactNode } from "react";

import type { ClickRow } from "./click-marks";
import { formatCount, formatDuration, formatShare, formatVital, ratingClass } from "./page-format";
import type { PageIssue, PageRead, PageStats, PageVitals, ReferrerCount } from "./page-reads";

type SectionProps<Value> = {
  title: string;
  read: Nullable<PageRead<Value>>;
  children: (value: Value) => ReactNode;
};

type StatsProps = { read: Nullable<PageRead<PageStats>> };
type ReferrersProps = { read: Nullable<PageRead<ReferrerCount[]>> };
type VitalsProps = { read: Nullable<PageRead<PageVitals>> };
type IssuesProps = { read: Nullable<PageRead<PageIssue[]>> };
type ClicksProps = { read: Nullable<PageRead<ClickRow[]>>; marked: number; following: boolean };

const noteClass = "py-1 text-console-dim";
const rowClass = "flex items-baseline justify-between gap-3 py-0.5";
const labelClass = "min-w-0 truncate text-console-muted";

function Section<Value>({ title, read, children }: SectionProps<Value>) {
  return (
    <section className="min-w-0 rounded-[6px] border border-console-line bg-console-surface px-2.5 py-2">
      <h3 className="mb-1 font-console-sans text-[11px] font-medium tracking-wide text-console-dim uppercase">
        {title}
      </h3>
      {read === null ? (
        <p className={`${noteClass} spc-thinking`}>Loading</p>
      ) : read.ok ? (
        children(read.value)
      ) : (
        <p className="py-1 text-console-accent" role="alert">
          {read.error}
        </p>
      )}
    </section>
  );
}

export function StatsRow({ read }: StatsProps) {
  const stats = read?.ok ? read.value : null;
  const tiles = [
    { label: "Visitors", value: stats ? formatCount(stats.visitors) : "–" },
    { label: "Pageviews", value: stats ? formatCount(stats.pageviews) : "–" },
    { label: "Bounce rate", value: stats ? formatShare(stats.bounceRate) : "–" },
    { label: "Time on page", value: stats ? formatDuration(stats.timeOnPageMs) : "–" },
  ];
  return (
    <div>
      <dl className="grid grid-cols-4 gap-2 max-[520px]:grid-cols-2">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="rounded-[6px] border border-console-line bg-console-surface px-2.5 py-1.5"
          >
            <dt className="font-console-sans text-[11px] text-console-dim">{tile.label}</dt>
            <dd className="text-sm text-console-strong tabular-nums">
              {read === null ? <span className="text-console-faint">…</span> : tile.value}
            </dd>
          </div>
        ))}
      </dl>
      {read && !read.ok ? (
        <p className="pt-1 text-console-accent" role="alert">
          {read.error}
        </p>
      ) : null}
    </div>
  );
}

export function ReferrersSection({ read }: ReferrersProps) {
  return (
    <Section title="Top referrers" read={read}>
      {(rows) =>
        rows.length === 0 ? (
          <p className={noteClass}>No visits in this range.</p>
        ) : (
          <ul>
            {rows.map((row) => (
              <li key={row.referrer} className={rowClass}>
                <span className={labelClass}>{row.referrer || "Direct"}</span>
                <span className="tabular-nums">{formatCount(row.visitors)}</span>
              </li>
            ))}
          </ul>
        )
      }
    </Section>
  );
}

export function VitalsSection({ read }: VitalsProps) {
  return (
    <Section title="Web Vitals" read={read}>
      {(vitals) =>
        vitals.samples === 0 ? (
          <p className={noteClass}>No speed samples in this range.</p>
        ) : (
          <>
            <p className={rowClass}>
              <span className={labelClass}>Score, {formatCount(vitals.samples)} samples</span>
              <span className={`tabular-nums ${ratingClass(vitals.rating)}`}>
                {vitals.score ?? "–"}
              </span>
            </p>
            <ul>
              {vitals.metrics.map((metric) => (
                <li key={metric.name} className={rowClass}>
                  <span className={labelClass}>{metric.name.toUpperCase()}</span>
                  <span className={`tabular-nums ${ratingClass(metric.rating)}`}>
                    {formatVital(metric.name, metric.value)}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )
      }
    </Section>
  );
}

export function IssuesSection({ read }: IssuesProps) {
  return (
    <Section title="Errors" read={read}>
      {(issues) =>
        issues.length === 0 ? (
          <p className={noteClass}>No errors on this path.</p>
        ) : (
          <ul>
            {issues.map((issue) => (
              <li key={issue.id} className={rowClass}>
                <span className={labelClass} title={issue.title ?? issue.id}>
                  {issue.title ?? issue.id}
                </span>
                <span className="text-console-accent tabular-nums">{formatCount(issue.count)}</span>
              </li>
            ))}
          </ul>
        )
      }
    </Section>
  );
}

export function ClicksSection({ read, marked, following }: ClicksProps) {
  return (
    <Section title="Clicks" read={read}>
      {(rows) => (
        <>
          {following && marked === 0 ? (
            <p className={noteClass}>
              This page has no marked elements. Add{" "}
              <code className="text-console-string">data-spoar-click="name"</code> to the ones to
              count.
            </p>
          ) : null}
          {!following ? <p className={noteClass}>Open this path to outline its elements.</p> : null}
          {rows.length === 0 ? (
            <p className={noteClass}>No clicks in this range.</p>
          ) : (
            <ul>
              {rows.map((row) => (
                <li key={row.label} className={rowClass}>
                  <span className={labelClass}>
                    {row.label}
                    {following && !row.onPage ? (
                      <span className="ml-1.5 text-console-faint">not on this page</span>
                    ) : null}
                  </span>
                  <span className="tabular-nums">{formatCount(row.count)}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Section>
  );
}
