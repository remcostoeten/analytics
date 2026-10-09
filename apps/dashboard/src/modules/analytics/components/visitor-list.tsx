import type { ProjectScope } from "@spoar/client";
import Link from "next/link";

import { ReadNotice } from "@/modules/session/components/read-notice";

import { formatDateTime, formatDimensionValue, formatMetric, formatRelative } from "../format";
import { viewQuery } from "../view-state";
import type { ViewState } from "../view-state";

type Props = { scope: ProjectScope; state: ViewState; path: string; cursor: string | undefined };

const pageSize = 50;

export async function VisitorList({ scope, state, path, cursor }: Props) {
  const read = await scope.visitors({ limit: pageSize, cursor });
  if (!read.ok) return <ReadNotice error={read.error} what="visitors" />;
  const rows = read.value.data;
  return (
    <section className="panel-section grid gap-4">
      {rows.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted">
          No visitors match this range and filters.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Visitor</th>
                <th scope="col">Country</th>
                <th scope="col">Device</th>
                <th scope="col" className="text-right">
                  Sessions
                </th>
                <th scope="col" className="text-right">
                  Pageviews
                </th>
                <th scope="col" className="text-right">
                  Last seen
                </th>
                <th scope="col" className="text-right">
                  First seen
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="font-mono text-xs">
                    <Link
                      href={`${path}/${encodeURIComponent(row.id)}${viewQuery(state)}`}
                      className="hover:underline"
                      prefetch={false}
                    >
                      {row.id.slice(0, 8)}
                    </Link>
                    {row.identified ? (
                      <span className="ml-2 rating rating-good">identified</span>
                    ) : null}
                    {row.isInternal ? (
                      <span className="ml-2 rating rating-none">internal</span>
                    ) : null}
                  </td>
                  <td className="text-xs">
                    {row.country ? formatDimensionValue("country", row.country) : "–"}
                  </td>
                  <td className="text-xs text-muted">
                    {row.browser ? `${row.browser} · ${row.device}` : row.device}
                  </td>
                  <td className="text-right tabular-nums">{formatMetric(row.sessions, "count")}</td>
                  <td className="text-right tabular-nums">
                    {formatMetric(row.pageviews, "count")}
                  </td>
                  <td
                    className="text-right text-xs whitespace-nowrap text-muted"
                    title={formatDateTime(row.lastSeen)}
                  >
                    {formatRelative(row.lastSeen)}
                  </td>
                  <td
                    className="text-right text-xs whitespace-nowrap text-muted"
                    title={formatDateTime(row.firstSeen)}
                  >
                    {formatRelative(row.firstSeen)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {read.value.nextCursor ? (
        <div className="flex justify-end">
          <Link
            href={`${path}${viewQuery(state)}${viewQuery(state) ? "&" : "?"}cursor=${encodeURIComponent(read.value.nextCursor)}`}
            className="ghost-button"
            prefetch={false}
          >
            Next page
          </Link>
        </div>
      ) : null}
    </section>
  );
}
