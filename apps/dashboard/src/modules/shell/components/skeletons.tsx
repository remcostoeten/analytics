import type { ReactNode } from "react";

type Props = { height: number };

const metricRows = ["visitors", "pageviews", "bounce", "duration", "events"];
const siteRows = ["first", "second", "third"];
const homeLists = ["channels", "referrers", "browsers", "systems"];
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
      data-testid="analytics-skeleton"
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
      data-testid="speed-skeleton"
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
    <div
      className="mx-auto grid max-w-[1200px] gap-6"
      aria-busy="true"
      data-testid="panel-skeleton"
    >
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

export function FactsSkeleton({ facts }: Pick<DetailProps, "facts">) {
  const grid = factGrids[facts];
  return (
    <div className={grid.className} aria-hidden="true">
      {grid.rows.map((row) => (
        <div key={row} className="grid gap-0.5">
          <Bar className="h-4 w-16" />
          <Bar className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function DetailSkeleton({ height, facts }: DetailProps) {
  return (
    <div
      className="mx-auto grid max-w-[1200px] gap-6"
      aria-busy="true"
      data-testid="detail-skeleton"
    >
      <div className="panel">
        <header className="panel-section grid gap-4" aria-hidden="true">
          <Bar className="h-4 w-24" />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Bar className="h-8 w-64 max-w-full" />
            <Bar className="h-4 w-32" />
          </div>
          <FactsSkeleton facts={facts} />
        </header>
        <SectionSkeleton height={height} />
      </div>
    </div>
  );
}

export function RealtimeBodySkeleton() {
  return (
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
  );
}

export function RealtimeSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-[1200px] gap-6"
      aria-busy="true"
      data-testid="realtime-skeleton"
    >
      <PageTitle width="w-72" />
      <RealtimeBodySkeleton />
    </div>
  );
}

export function OverviewSkeleton() {
  return (
    <div
      className="mx-auto grid max-w-[1400px] gap-4"
      aria-busy="true"
      data-testid="overview-skeleton"
    >
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
    <div className="grid gap-4" aria-busy="true" data-testid="logs-skeleton">
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
    <div className="mx-auto grid max-w-[1200px] gap-4" aria-busy="true" data-testid="home-skeleton">
      <header className="flex flex-wrap items-start justify-between gap-4 pb-2" aria-hidden="true">
        <div className="grid gap-1">
          <Bar className="h-9 w-40" />
          <Bar className="h-5 w-72 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Bar className="h-[34px] w-40" />
          <Bar className="h-[34px] w-28 rounded-full" />
        </div>
      </header>
      <div className="home-top" aria-hidden="true">
        <Bar className="h-[392px]" />
        <Bar className="h-[392px]" />
      </div>
      <div className="home-pair" aria-hidden="true">
        <Bar className="h-[340px]" />
        <Bar className="h-[340px]" />
      </div>
      <div className="home-quad" aria-hidden="true">
        {homeLists.map((list) => (
          <Bar key={list} className="h-[252px]" />
        ))}
      </div>
      <Bar className="h-[196px]" />
    </div>
  );
}

type AdminHeaderProps = { meta?: boolean; action?: boolean };

function AdminHeader({ meta = false, action = false }: AdminHeaderProps) {
  return (
    <div
      className="flex items-end justify-between gap-4 border-b border-line pb-3"
      aria-hidden="true"
    >
      <div className="flex items-baseline gap-3">
        <Bar className="h-8 w-48" />
        {meta ? <Bar className="h-4 w-24" /> : null}
      </div>
      {action ? <Bar className="h-8 w-28" /> : null}
    </div>
  );
}

type FieldSkeletonProps = { control?: string; hint?: boolean };

function FieldSkeleton({ control = "h-[38px]", hint = false }: FieldSkeletonProps) {
  return (
    <div className="grid gap-1.5">
      <Bar className="h-4 w-24" />
      <Bar className={control} />
      {hint ? <Bar className="h-4 w-full max-w-sm" /> : null}
    </div>
  );
}

function ListSkeleton({ rows, action = false }: { rows: string[]; action?: boolean }) {
  return (
    <ul className="card divide-y divide-line" aria-hidden="true">
      {rows.map((row) => (
        <li key={row} className="flex items-center justify-between gap-4 px-4 py-3">
          <span className="grid gap-0.5">
            <Bar className="h-5 w-40" />
            <Bar className="h-4 w-28" />
          </span>
          <span className="flex items-center gap-4">
            <Bar className="hidden h-4 w-40 sm:block" />
            {action ? <Bar className="h-8 w-20" /> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ProjectsSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" data-testid="projects-skeleton">
      <AdminHeader meta action />
      <ListSkeleton rows={siteRows} />
    </div>
  );
}

export function NewProjectSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" data-testid="new-project-skeleton">
      <AdminHeader />
      <div className="grid max-w-xl gap-5" aria-hidden="true">
        <FieldSkeleton hint />
        <FieldSkeleton hint />
        <FieldSkeleton hint />
        <FieldSkeleton />
        <FieldSkeleton control="h-20" hint />
        <Bar className="h-8 w-32" />
      </div>
    </div>
  );
}

const tokenRows = ["first", "second"];

export function TokensSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" data-testid="tokens-skeleton">
      <AdminHeader meta />
      <div className="grid max-w-xl gap-1" aria-hidden="true">
        <Bar className="h-5" />
        <Bar className="h-5 w-2/3" />
      </div>
      <ListSkeleton rows={tokenRows} action />
      <section className="grid gap-4" aria-hidden="true">
        <Bar className="h-4 w-20" />
        <div className="grid max-w-xl gap-5">
          <FieldSkeleton hint />
          <FieldSkeleton />
          <FieldSkeleton control="h-20" hint />
          <FieldSkeleton control="h-[38px] max-w-48" hint />
          <Bar className="h-8 w-28" />
        </div>
      </section>
    </div>
  );
}

const settingsToggles = ["public", "sql", "widget"];
const connectionStats = ["accepted", "duplicates", "rejected", "rate"];

function CardSkeleton({ children }: { children: ReactNode }) {
  return <div className="card grid gap-3 p-4">{children}</div>;
}

function CardHead({ title, action }: { title: string; action: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Bar className={`h-4 ${title}`} />
      <Bar className={`h-8 ${action}`} />
    </div>
  );
}

export function ConnectionSkeleton() {
  return (
    <div className="card grid gap-3 p-4" aria-hidden="true">
      <div className="flex items-center justify-between gap-4">
        <Bar className="h-5 w-28" />
        <Bar className="h-4 w-24" />
      </div>
      <Bar className="h-5 w-full max-w-xs" />
      <div className="grid grid-cols-4 gap-2">
        {connectionStats.map((stat) => (
          <div key={stat} className="grid gap-0.5">
            <Bar className="h-4 w-14" />
            <Bar className="h-5 w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProjectSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" data-testid="project-skeleton">
      <AdminHeader meta />
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" aria-hidden="true">
        <section className="grid content-start gap-4">
          <Bar className="h-4 w-20" />
          <div className="grid gap-5">
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton control="h-20" hint />
            <FieldSkeleton control="h-[38px] w-32" hint />
            <div className="grid gap-3">
              {settingsToggles.map((toggle) => (
                <div key={toggle} className="flex items-start gap-3">
                  <Bar className="mt-0.5 size-4" />
                  <div className="grid flex-1 gap-1">
                    <Bar className="h-4 w-32" />
                    <Bar className="h-3.5 w-full max-w-xs" />
                  </div>
                </div>
              ))}
            </div>
            <Bar className="h-8 w-16" />
          </div>
        </section>
        <section className="grid content-start gap-4">
          <Bar className="h-4 w-24" />
          <ConnectionSkeleton />
          <Bar className="h-4 w-12" />
          <div className="grid gap-4">
            <CardSkeleton>
              <CardHead title="w-20" action="w-32" />
              <Bar className="h-[38px]" />
              <Bar className="h-4 w-full max-w-sm" />
            </CardSkeleton>
            <CardSkeleton>
              <CardHead title="w-20" action="w-16" />
              <Bar className="h-4 w-full max-w-sm" />
            </CardSkeleton>
            <CardSkeleton>
              <CardHead title="w-24" action="w-14" />
              <Bar className="h-[58px]" />
            </CardSkeleton>
            <CardSkeleton>
              <CardHead title="w-28" action="w-16" />
              <Bar className="h-4 w-full max-w-sm" />
            </CardSkeleton>
          </div>
        </section>
      </div>
    </div>
  );
}
