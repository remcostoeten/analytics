export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from "react";
import { fetchMetrics, fetchProjects } from "@/lib/queries";
import { rangeFromPreset, formatCompact, formatDuration, formatPercentage } from "@/lib/date-utils";
import { TimeseriesChart } from "@/components/timeseries-chart";
import { MetricCard } from "@/components/metric-card";
import { FilterBar } from "@/components/filter-bar";

function trendFor(kpi: { changePercent: number | null }, invertPositive?: boolean) {
  if (kpi.changePercent === null) return undefined;
  const isPositive = invertPositive ? kpi.changePercent < 0 : kpi.changePercent > 0;
  return { value: Math.abs(kpi.changePercent), isPositive };
}

async function DashboardData({
  projectId,
  range,
  showBots,
  showLocalhost
}: {
  projectId: string;
  range: string;
  showBots: boolean;
  showLocalhost: boolean;
}) {
  const dateRange = rangeFromPreset(range as "24h" | "7d" | "30d" | "90d");

  const metrics = await fetchMetrics(projectId, dateRange, {
    showBots,
    showLocalhost,
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-6">
        <MetricCard
          title="Page Views"
          value={formatCompact(metrics.pageviews)}
          trend={trendFor(metrics.wow.pageviews)}
        />
        <MetricCard
          title="Unique Visitors"
          value={formatCompact(metrics.visitors)}
          trend={trendFor(metrics.wow.visitors)}
        />
        <MetricCard
          title="Sessions"
          value={formatCompact(metrics.sessions)}
          trend={trendFor(metrics.wow.sessions)}
        />
        <MetricCard
          title="Avg Session"
          value={formatDuration(metrics.avgSessionDurationMs)}
          trend={trendFor(metrics.wow.avgSessionDurationMs)}
        />
        <MetricCard
          title="Pages / Session"
          value={metrics.avgPagesPerSession.toFixed(1)}
          trend={trendFor(metrics.wow.avgPagesPerSession)}
        />
        <MetricCard
          title="Bounce Rate"
          value={formatPercentage(metrics.bounceRate)}
          trend={trendFor(metrics.wow.bounceRate, true)}
        />
      </div>

      {/* Timeseries Chart */}
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Page Views Over Time</h2>
        <TimeseriesChart data={metrics.timeseries} height={300} />
      </div>

      {/* Top Pages + Entry/Exit Pages */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Top Pages</h2>
          {metrics.topPages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pages tracked yet</p>
          ) : (
            <div className="space-y-2">
              {metrics.topPages.map(function (page, i) {
                return (
                  <div key={i} className="flex justify-between items-center py-3 px-2 rounded-md hover:bg-muted transition-colors border-b last:border-0">
                    <span className="font-mono text-sm truncate flex-1">{page.path}</span>
                    <span className="font-semibold ml-4 text-primary">{formatCompact(page.views)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Entry Pages</h2>
          {metrics.entryPages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No entry pages yet</p>
          ) : (
            <div className="space-y-2">
              {metrics.entryPages.map(function (page, i) {
                return (
                  <div key={i} className="flex justify-between items-center py-3 px-2 rounded-md hover:bg-muted transition-colors border-b last:border-0">
                    <span className="font-mono text-sm truncate flex-1">{page.path}</span>
                    <span className="font-semibold ml-4 text-primary">{formatCompact(page.count)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Exit Pages</h2>
          {metrics.exitPages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No exit pages yet</p>
          ) : (
            <div className="space-y-2">
              {metrics.exitPages.map(function (page, i) {
                return (
                  <div key={i} className="flex justify-between items-center py-3 px-2 rounded-md hover:bg-muted transition-colors border-b last:border-0">
                    <span className="font-mono text-sm truncate flex-1">{page.path}</span>
                    <span className="font-semibold ml-4 text-primary">{formatCompact(page.count)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Referrers */}
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold mb-4">Top Referrers</h2>
        {metrics.topReferrers.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No referrers tracked yet</p>
        ) : (
          <div className="space-y-2">
            {metrics.topReferrers.map(function (ref, i) {
              return (
                <div key={i} className="flex justify-between items-center py-3 px-2 rounded-md hover:bg-muted transition-colors border-b last:border-0">
                  <span className="text-sm truncate flex-1">{ref.referrer}</span>
                  <span className="font-semibold ml-4 text-primary">{formatCompact(ref.visits)}</span>
                </div>
              );
            })}
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
            {metrics.geo.slice(0, 10).map(function (location, i) {
              return (
                <div key={i} className="flex justify-between items-center py-3 px-2 rounded-md hover:bg-muted transition-colors border-b last:border-0">
                  <span className="text-sm flex-1">
                    {[location.city, location.region, location.country]
                      .filter(Boolean)
                      .join(", ") || "Unknown"}
                  </span>
                  <span className="font-semibold ml-4 text-primary">{formatCompact(location.visitors)}</span>
                </div>
              );
            })}
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
  searchParams: Promise<{
    project?: string;
    range?: string;
    bots?: string;
    localhost?: string;
  }>;
}) {
  const params = await searchParams;
  const projectId = params.project || "localhost";
  const range = params.range || "7d";
  const showBots = params.bots === "true";
  const showLocalhost = params.localhost === "true";

  const projects = await fetchProjects();

  return (
    <>
      <FilterBar projects={projects} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            {range === "24h" && "Last 24 hours"}
            {range === "7d" && "Last 7 days"}
            {range === "30d" && "Last 30 days"}
            {range === "90d" && "Last 90 days"}
          </p>
        </div>
          <Suspense fallback={<DashboardSkeleton />}>
            <DashboardData
              projectId={projectId}
              range={range}
              showBots={showBots}
              showLocalhost={showLocalhost}
            />
          </Suspense>
      </div>
    </>
  );
}
