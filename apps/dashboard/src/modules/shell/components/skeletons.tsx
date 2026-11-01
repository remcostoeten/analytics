import type { ReactNode } from "react";

import { GhostCard, GhostList, GhostSection, GhostTile } from "./ghost";

type Props = { height: number };

const metricRows = ["visitors", "pageviews", "bounce", "duration", "events"];
const siteRows = ["first", "second", "third"];
const homeLists = ["channels", "referrers", "browsers", "systems"];
const kpiRows = ["visitors", "pageviews", "bounce", "duration"];
const sessionFacts = ["visitor", "started", "duration", "bot"];
const issueFacts = ["events", "users", "last", "first", "first-release", "last-release"];
const realtimeRows = [116, 100, 100];
const realtimeSections = [
  { kind: "list", height: 170, rows: 3 },
  { kind: "stats", height: 111, rows: 0 },
  { kind: "list", height: 139, rows: 2 },
  { kind: "list", height: 139, rows: 2 },
] as const;
const vitalHeights = [101, 91, 91, 91, 91, 91];

function Bar({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />;
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
        <GhostTile height={114} wide />
        <div className="rail">
          {metricRows.map((row) => (
            <GhostTile key={row} height={116} />
          ))}
        </div>
      </aside>
      <div className="panel">
        <PanelHeading>
          <ControlRow />
        </PanelHeading>
        <GhostSection kind="chart" height={430} />
        <GhostSection kind="map" height={320} />
        <GhostSection kind="list" height={570} rows={10} />
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
            <GhostTile key={index} height={height} />
          ))}
        </div>
      </aside>
      <div className="panel">
        <PanelHeading>
          <ControlRow chips={false} />
          <Bar className="h-7 w-56 max-w-full" />
        </PanelHeading>
        <GhostSection kind="chart" height={424} />
        <GhostSection kind="list" height={282} rows={5} />
        <GhostSection kind="list" height={240} rows={4} />
      </div>
    </div>
  );
}

type PanelProps = Props & { heading?: "filters" | "tabs"; rows?: number };

export function PanelSkeleton({ height, heading = "filters", rows = 7 }: PanelProps) {
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
        <GhostSection kind="list" height={height} rows={rows} />
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
        <GhostSection kind="list" height={height} rows={6} />
      </div>
    </div>
  );
}

export function RealtimeBodySkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]" aria-hidden="true">
      <aside className="rail">
        {realtimeRows.map((height, index) => (
          <GhostTile key={index} height={height} />
        ))}
        <Bar className="h-4 w-40" />
      </aside>
      <div className="panel">
        {realtimeSections.map((section, index) => (
          <GhostSection key={index} {...section} />
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
          <GhostCard key={row} kind="stats" height={132} />
        ))}
      </div>
      <GhostCard kind="chart" height={328} />
      <div className="overview-split">
        <GhostCard kind="list" height={300} rows={5} />
        <GhostCard kind="list" height={300} rows={5} />
      </div>
      <GhostCard kind="stats" height={108} />
      <GhostCard kind="list" height={720} rows={8} />
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
          <GhostList height={408} rows={10} />
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <div className="panel">
            <GhostSection kind="chart" height={310} />
          </div>
          <div className="panel">
            <GhostSection kind="list" height={480} rows={10} />
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
      <div className="home-top">
        <GhostCard kind="metrics" height={392} />
        <GhostCard kind="list" height={392} rows={4} />
      </div>
      <div className="home-pair">
        <GhostCard kind="list" height={340} rows={6} />
        <GhostCard kind="list" height={340} rows={6} />
      </div>
      <GhostCard kind="map" height={460} />
      <div className="home-quad">
        {homeLists.map((list) => (
          <GhostCard key={list} kind="list" height={252} rows={5} />
        ))}
      </div>
      <GhostCard kind="list" height={196} rows={3} />
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

const memberRows = ["first", "second"];

export function MembersSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" data-testid="members-skeleton">
      <AdminHeader meta />
      <div className="grid max-w-xl gap-1" aria-hidden="true">
        <Bar className="h-5" />
        <Bar className="h-5 w-2/3" />
      </div>
      <ListSkeleton rows={memberRows} action />
      <section className="grid gap-4" aria-hidden="true">
        <Bar className="h-4 w-28" />
        <div className="grid max-w-xl gap-5">
          <FieldSkeleton hint />
          <FieldSkeleton />
          <FieldSkeleton control="h-20" hint />
          <Bar className="h-8 w-32" />
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
