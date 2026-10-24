import type { ProjectScope } from "@spoar/client";
import type { DeviceType, VisitorRow } from "@spoar/contract";
import type { CSSProperties, ReactNode } from "react";
import { Link } from "@/shared/ui/link";

import { ReadNotice } from "@/modules/session/components/read-notice";
import { EmptyState, SearchIllustration } from "@/shared/ui/empty-state";
import { DesktopIcon, GlobeIcon, MobileIcon, TabletIcon } from "@/shared/ui/icons";

import { formatDateTime, formatDimensionValue, formatMetric, formatRelative } from "../format";
import { hasFilters, viewQuery } from "../view-state";
import type { ViewState } from "../view-state";
import { countryFlag, groupVisitors, visitorHue } from "../visitor-presentation";

type Props = { scope: ProjectScope; state: ViewState; path: string; cursor: string | undefined };

type CountProps = { value: number; max: number };

const pageSize = 50;

const deviceIcons: { [Device in DeviceType]: ReactNode } = {
  desktop: <DesktopIcon className="size-3.5" />,
  mobile: <MobileIcon className="size-3.5" />,
  tablet: <TabletIcon className="size-3.5" />,
  bot: <GlobeIcon className="size-3.5" />,
  unknown: <GlobeIcon className="size-3.5" />,
};

function Count({ value, max }: CountProps) {
  return (
    <span className="visitor-count">
      <span className="tabular-nums">{formatMetric(value, "count")}</span>
      <span className="bar-track" aria-hidden="true">
        <span className="bar-fill" style={{ width: `${(value / max) * 100}%` }} />
      </span>
    </span>
  );
}

function Row({ row, href, max }: { row: VisitorRow; href: string; max: number }) {
  const country = row.country ? formatDimensionValue("country", row.country) : null;
  const flag = countryFlag(row.country);
  return (
    <li>
      <Link href={href} className="visitor-row">
        <span className="visitor-who">
          <span
            className="visitor-avatar"
            style={{ "--hue": visitorHue(row.id) } as CSSProperties}
            aria-hidden="true"
          >
            {row.id.slice(-2)}
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className="font-mono text-xs">{row.id.slice(0, 8)}</span>
            <span className="visitor-badges">
              <span className={`rating ${row.sessions > 1 ? "rating-good" : "rating-none"}`}>
                {row.sessions > 1 ? "returning" : "new"}
              </span>
              {row.identified ? <span className="rating rating-good">identified</span> : null}
              {row.isInternal ? <span className="rating rating-none">internal</span> : null}
            </span>
          </span>
        </span>
        <span className="visitor-place" title={country ?? "Unknown country"}>
          <span className="visitor-flag" aria-hidden="true">
            {flag || <GlobeIcon className="size-3.5 text-muted" />}
          </span>
          <span className="truncate">{country ?? "Unknown"}</span>
        </span>
        <span className="visitor-device">
          <span className="text-muted">{deviceIcons[row.device]}</span>
          <span className="truncate">
            {row.browser ?? (row.device === "unknown" ? "Unknown browser" : row.device)}
          </span>
        </span>
        <Count value={row.sessions} max={max} />
        <Count value={row.pageviews} max={max} />
        <span className="visitor-when">
          <span title={formatDateTime(row.lastSeen)}>{formatRelative(row.lastSeen)}</span>
          <span className="text-muted" title={formatDateTime(row.firstSeen)}>
            {row.sessions > 1 ? `since ${formatRelative(row.firstSeen)}` : "first visit"}
          </span>
        </span>
      </Link>
    </li>
  );
}

export async function VisitorList({ scope, state, path, cursor }: Props) {
  const read = await scope.visitors({ limit: pageSize, cursor });
  if (!read.ok) return <ReadNotice error={read.error} what="visitors" />;
  const rows = read.value.data;
  const max = Math.max(1, ...rows.map((row) => Math.max(row.sessions, row.pageviews)));
  const groups = groupVisitors(rows, Date.now());
  const query = viewQuery(state);
  return (
    <section className="panel-section grid gap-4">
      {rows.length === 0 ? (
        <EmptyState
          title="No visitors match"
          description="Nobody visited in this range with these filters."
          illustration={<SearchIllustration />}
        >
          {hasFilters(state) ? (
            <Link href={`${path}${viewQuery({ ...state, filters: {} })}`} className="ghost-button">
              Clear filters
            </Link>
          ) : null}
        </EmptyState>
      ) : (
        <div className="visitor-groups">
          <div className="visitor-head" aria-hidden="true">
            <span>Visitor</span>
            <span>Country</span>
            <span>Browser</span>
            <span>Sessions</span>
            <span>Pageviews</span>
            <span>Last seen</span>
          </div>
          {groups.map((group) => (
            <section key={group.bucket} className="visitor-group">
              <h3 className="visitor-group-title">
                {group.label}
                <span className="text-muted">
                  {" "}
                  · {group.rows.length} {group.rows.length === 1 ? "visitor" : "visitors"}
                </span>
              </h3>
              <ul className="visitor-rows">
                {group.rows.map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    max={max}
                    href={`${path}/${encodeURIComponent(row.id)}${query}`}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      {read.value.nextCursor ? (
        <div className="flex justify-end">
          <Link
            href={`${path}${query}${query ? "&" : "?"}cursor=${encodeURIComponent(read.value.nextCursor)}`}
            className="ghost-button"
          >
            Next page
          </Link>
        </div>
      ) : null}
    </section>
  );
}
