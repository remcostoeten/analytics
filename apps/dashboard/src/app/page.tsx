export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from "react";
import { fetchMetrics } from "@/lib/queries";
import { rangeFromPreset, formatCompact } from "@/lib/date-utils";
import { TimeseriesChart } from "@/components/timeseries-chart";
import { MetricCard } from "@/components/metric-card";
import { FilterBar } from "@/components/filter-bar";

async function DashboardData({ range }: { range: string }) {
  const projectId = "localhost";
  const dateRange = rangeFromPreset(range as "24h" | "7d" | "30d" | "90d");

  const metrics = await fetchMetrics(projectId, dateRange);

  return (
    <div className="space-y-8">
      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Page Views"
          value={formatCompact(metrics.pageviews)}
        />
        <MetricCard
          title="Unique Visitors"
          value={formatCompact(metrics.visitors)}
        />
        <MetricCard
          title="Sessions"
          value={formatCompact(metrics.sessions)}
        />
      </div>

      {/* Timeseries Chart */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Page Views Over Time</h2>
        <TimeseriesChart data={metrics.timeseries} height={350} />
      </div>

      {/* Top Pages */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Top Pages</h2>
        {metrics.topPages.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No pages tracked yet</p>
        ) : (
          <div className="space-y-2">
            {metrics.topPages.map((page, i) => (
              <div key={i} className="flex justify-between items-center py-3 px-2 rounded-md hover:bg-muted transition-colors border-b last:border-0">
                <span className="font-mono text-sm truncate flex-1">{page.path}</span>
                <span className="font-semibold ml-4 text-primary">{formatCompact(page.views)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Referrers */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Top Referrers</h2>
        {metrics.topReferrers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No referrers tracked yet</p>
        ) : (
          <div className="space-y-2">
            {metrics.topReferrers.map((ref, i) => (
              <div key={i} className="flex justify-between items-center py-3 px-2 rounded-md hover:bg-muted transition-colors border-b last:border-0">
                <span className="text-sm truncate flex-1">{ref.referrer}</span>
                <span className="font-semibold ml-4 text-primary">{formatCompact(ref.visits)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Geographic Distribution */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-xl font-semibold mb-4">Geographic Distribution</h2>
        {metrics.geo.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No geographic data yet</p>
        ) : (
          <div className="space-y-2">
            {metrics.geo.slice(0, 10).map((location, i) => (
              <div key={i} className="flex justify-between items-center py-3 px-2 rounded-md hover:bg-muted transition-colors border-b last:border-0">
                <span className="text-sm flex-1">
                  {[location.city, location.region, location.country]
                    .filter(Boolean)
                    .join(", ") || "Unknown"}
                </span>
                <span className="font-semibold ml-4 text-primary">{formatCompact(location.visitors)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border bg-card p-6">
            <div className="h-4 w-24 bg-muted rounded mb-2" />
            <div className="h-8 w-32 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-lg border bg-card p-6">
        <div className="h-6 w-48 bg-muted rounded mb-4" />
        <div className="h-[350px] bg-muted rounded" />
      </div>
      <div className="rounded-lg border bg-card p-6 h-64">
        <div className="h-6 w-32 bg-muted rounded mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 bg-muted rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const params = await searchParams;
  const range = params.range || "7d";

  return (
    <>
      <FilterBar />
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              {range === "24h" && "Last 24 hours"}
              {range === "7d" && "Last 7 days"}
              {range === "30d" && "Last 30 days"}
              {range === "90d" && "Last 90 days"}
            </p>
          </div>
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardData range={range} />
          </Suspense>
        </div>
      </div>
    </>
  );
}
