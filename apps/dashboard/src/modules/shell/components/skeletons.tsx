import type { ReactNode } from "react";

type Props = { height: number };

const metricRows = ["visitors", "pageviews", "bounce", "duration", "events"];
const siteRows = ["first", "second", "third"];
const kpiRows = ["visitors", "pageviews", "bounce", "duration"];
const sessionFacts = ["visitor", "started", "duration", "bot"];
const issueFacts = ["events", "users", "last", "first", "first-release", "last-release"];
const realtimeRows = [116, 100, 100];
const realtimeSections = [170, 111, 139, 139];
const vitalHeights = [101, 91, 91, 91, 91, 91];

function Bar({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function SectionSkeleton({ height }: Props) {
  return (
    <div className="panel-section" aria-hidden="true">
      <div className="skeleton" style={{ height }} />
    </div>
  );
}

function ControlRow({ chips = true }: { chips?: boolean }) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Bar className="h-7 w-28" />
        <Bar className="h-8 w-44" />
      </div>
      {chips ? <Bar className="h-7 w-44" /> : null}
    </>
  );
}

function PanelHeading({ children }: { children?: ReactNode }) {
  return (
    <header className="panel-section panel-head grid gap-3" aria-hidden="true">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Bar className="h-9 w-72 max-w-full" />
        <Bar className="h-4 w-32" />
      </div>
      {children}
    </header>
  );
}

function PageTitle({ width }: { width: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <Bar className={`h-9 max-w-full ${width}`} />
      <Bar className="h-4 w-32" />
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]"
      aria-busy="true"
    >
      <aside className="grid gap-6" aria-hidden="true">
        <Bar className="h-[114px]" />
        <div className="rail">
          {metricRows.map((row) => (
            <Bar key={row} className="h-[116px]" />
          ))}
        </div>
      </aside>
      <div className="panel">
        <PanelHeading>
          <ControlRow />
        </PanelHeading>
        <SectionSkeleton height={430} />
        <SectionSkeleton height={320} />
        <SectionSkeleton height={570} />
      </div>
    </div>
  );
}

export function SpeedSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]"
      aria-busy="true"
    >
      <aside className="grid gap-6" aria-hidden="true">
        <div className="rail">
          {vitalHeights.map((height, index) => (
            <div key={index} className="skeleton" style={{ height }} />
          ))}
        </div>
      </aside>
      <div className="panel">
        <PanelHeading>
          <ControlRow chips={false} />
          <Bar className="h-7 w-56 max-w-full" />
        </PanelHeading>
        <SectionSkeleton height={424} />
        <SectionSkeleton height={282} />
        <SectionSkeleton height={240} />
      </div>
    </div>
  );
}

type PanelProps = Props & { heading?: "filters" | "tabs" };

export function PanelSkeleton({ height, heading = "filters" }: PanelProps) {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6" aria-busy="true">
      <div className="panel">
        <PanelHeading>
          {heading === "tabs" ? (
            <>
              <Bar className="h-5 max-w-3xl" />
              <Bar className="h-7 w-40" />
            </>
          ) : (
            <ControlRow />
          )}
        </PanelHeading>
        <SectionSkeleton height={height} />
      </div>
    </div>
  );
}

type DetailProps = Props & { facts: 4 | 6 };

const factGrids = {
  4: { rows: sessionFacts, className: "grid grid-cols-2 gap-4 sm:grid-cols-4" },
  6: { rows: issueFacts, className: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" },
};

export function DetailSkeleton({ height, facts }: DetailProps) {
  const grid = factGrids[facts];
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6" aria-busy="true">
      <div className="panel">
        <header className="panel-section grid gap-4" aria-hidden="true">
          <Bar className="h-4 w-24" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Bar className="h-8 w-64 max-w-full" />
            <Bar className="h-4 w-32" />
          </div>
          <div className={grid.className}>
            {grid.rows.map((row) => (
              <div key={row} className="grid gap-0.5">
                <Bar className="h-4 w-16" />
                <Bar className="h-5 w-24" />
              </div>
            ))}
          </div>
        </header>
        <SectionSkeleton height={height} />
      </div>
    </div>
  );
}

export function RealtimeSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6" aria-busy="true">
      <PageTitle width="w-72" />
      <div className="grid items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]" aria-hidden="true">
        <aside className="rail">
          {realtimeRows.map((height, index) => (
            <div key={index} className="skeleton" style={{ height }} />
          ))}
          <Bar className="h-4 w-40" />
        </aside>
        <div className="panel">
          {realtimeSections.map((height, index) => (
            <SectionSkeleton key={index} height={height} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-4" aria-busy="true">
      <header className="grid gap-3" aria-hidden="true">
        <PageTitle width="w-64" />
        <ControlRow />
      </header>
      <div className="kpi-row" aria-hidden="true">
        {kpiRows.map((row) => (
          <Bar key={row} className="h-[132px]" />
        ))}
      </div>
      <div className="card">
        <Bar className="h-[328px]" />
      </div>
      <div className="overview-split">
        <div className="card">
          <Bar className="h-[300px]" />
        </div>
        <div className="card">
          <Bar className="h-[300px]" />
        </div>
      </div>
      <div className="card">
        <Bar className="h-[108px]" />
      </div>
      <Bar className="h-[720px]" />
    </div>
  );
}

export function LogsSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <header className="log-toolbar" aria-hidden="true">
        <div className="flex flex-wrap items-center gap-3">
          <Bar className="h-9 w-24" />
          <Bar className="h-4 w-32" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Bar className="h-7 w-28" />
            <Bar className="h-8 w-64" />
          </div>
          <Bar className="h-8 w-44" />
        </div>
      </header>
      <div className="log-layout">
        <div className="field-sidebar" aria-hidden="true">
          <Bar className="h-[408px]" />
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <div className="panel">
            <SectionSkeleton height={310} />
          </div>
          <div className="panel">
            <SectionSkeleton height={480} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function HomeSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1040px] gap-6" aria-busy="true">
      <header
        className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6"
        aria-hidden="true"
      >
        <div className="grid gap-1">
          <Bar className="h-9 w-56" />
          <Bar className="h-5 w-80 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Bar className="h-[34px] w-20 rounded-full" />
          <Bar className="h-[34px] w-28 rounded-full" />
        </div>
      </header>
      <ul className="grid gap-2" aria-hidden="true">
        {siteRows.map((row) => (
          <li key={row}>
            <Bar className="h-[94px] rounded-xl" />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AdminSkeleton({ height }: Props) {
  return (
    <div className="grid gap-6" aria-busy="true">
      <div
        className="flex items-end justify-between gap-4 border-b border-line pb-3"
        aria-hidden="true"
      >
        <Bar className="h-8 w-48" />
      </div>
      <div className="skeleton" style={{ height }} aria-hidden="true" />
    </div>
  );
}
