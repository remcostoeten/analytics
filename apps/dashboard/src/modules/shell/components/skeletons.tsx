import type { ReactNode } from "react";

import { GhostCard, GhostKpi, GhostList, GhostSection, GhostTile } from "./ghost";
import { ghostSizes } from "./ghost-sizes";

type Props = { height: number };

const metricRows = ["visitors", "pageviews", "bounce", "duration", "events"];
const siteRows = ["first", "second", "third"];
const homeLists = ["channels", "referrers", "browsers", "systems"];
const kpiRows = ["visitors", "pageviews", "bounce", "duration"];
const sessionFacts = ["visitor", "started", "duration", "bot"];
const issueFacts = ["events", "users", "last", "first", "first-release", "last-release"];
const overviewLists = ["paths", "hosts", "referrers", "browsers", "systems", "channels"];

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
        <GhostTile height={ghostSizes.vitalsTile} wide />
        <div className="rail">
          {metricRows.map((row) => (
            <GhostTile key={row} height={ghostSizes.railTile} />
          ))}
        </div>
      </aside>
      <div className="panel">
        <PanelHeading>
          <ControlRow />
        </PanelHeading>
        <GhostSection kind="summary" height={ghostSizes.summary} />
        <GhostSection kind="map" rows={8} />
        <GhostSection kind="sources" rows={5} />
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
          {ghostSizes.speedTiles.map((height, index) => (
            <GhostTile key={index} height={height} />
          ))}
        </div>
      </aside>
      <div className="panel">
        <PanelHeading>
          <ControlRow chips={false} />
          <Bar className="mt-3 h-[27px] w-56 max-w-full" />
        </PanelHeading>
        <GhostSection kind="chart" height={ghostSizes.speedChart} />
        <GhostSection kind="list" height={ghostSizes.speedRoutes} rows={5} />
        <GhostSection kind="list" height={ghostSizes.speedElements} rows={4} />
      </div>
    </div>
  );
}

type PanelProps = Props & { heading?: "filters" | "tabs"; rows?: number; summary?: boolean };

export function PanelSkeleton({
  height,
  heading = "filters",
  rows = 7,
  summary = false,
}: PanelProps) {
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
        {summary ? <GhostSection kind="stats" height={ghostSizes.visitorSummary} /> : null}
        <GhostSection kind="list" height={height} rows={rows} />
      </div>
    </div>
  );
}

type DetailProps = Props & { facts: 4 | 6 | "visitor" };

const factGrids = {
  4: { rows: sessionFacts, className: "grid grid-cols-2 gap-4 sm:grid-cols-4" },
  6: { rows: issueFacts, className: "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" },
};

const visitorPlaces = ["place", "device", "browser", "seen"];
const visitorChips = ["w-24", "w-20", "w-16"];
const visitorPairs = ["pages", "sessions"];

export function FactsSkeleton({ facts }: Pick<DetailProps, "facts">) {
  if (facts === "visitor") {
    return (
      <>
        <FactsSkeleton facts={6} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
          {visitorPlaces.map((place) => (
            <div key={place} className="grid gap-0.5">
              <Bar className="h-4 w-16" />
              <Bar className="h-5 w-32" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-hidden="true">
          {visitorChips.map((width) => (
            <Bar key={width} className={`h-[18px] rounded-full ${width}`} />
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-2" aria-hidden="true">
          {visitorPairs.map((pair) => (
            <div key={pair} className="grid content-start gap-2">
              <Bar className="my-[3px] h-3.5 w-24" />
              <Bar className="h-6" />
            </div>
          ))}
        </div>
      </>
    );
  }
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
            <Bar className="h-[35px] w-64 max-w-full" />
            <Bar className="h-4 w-32" />
          </div>
          <FactsSkeleton facts={facts} />
        </header>
        <GhostSection kind="list" height={height} rows={facts === 4 ? 4 : 3} />
      </div>
    </div>
  );
}

export function RealtimeBodySkeleton() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]" aria-hidden="true">
      <aside className="rail">
        {ghostSizes.realtimeTiles.map((height, index) => (
          <GhostTile key={index} height={height} />
        ))}
        <Bar className="h-4 w-40" />
      </aside>
      <div className="panel">
        <GhostSection kind="list" height={ghostSizes.realtimeFeed} rows={8} />
        <GhostSection kind="pair" height={ghostSizes.realtimeNow} rows={1} />
        <GhostSection kind="list" height={ghostSizes.realtimeList} rows={8} />
        <GhostSection kind="list" height={ghostSizes.realtimeList} rows={8} />
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
          <GhostKpi key={row} />
        ))}
      </div>
      <GhostCard kind="chart" height={ghostSizes.overviewChart} head="title" />
      <div className="overview-split">
        <GhostCard kind="list" height={ghostSizes.overviewSplit} rows={5} head="title" />
        <GhostCard kind="list" height={ghostSizes.overviewSplit} rows={5} head="title" />
      </div>
      <GhostCard kind="outcome" height={ghostSizes.overviewOutcome} />
      <div className="top-grid">
        {overviewLists.map((list) => (
          <GhostCard key={list} kind="list" height={ghostSizes.overviewTop} rows={8} head="title" />
        ))}
      </div>
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
        <div />
      </header>
      <div className="log-layout">
        <div className="field-sidebar" aria-hidden="true">
          <GhostList height={408} rows={10} />
        </div>
        <div className="grid min-w-0 content-start gap-4">
          <div className="panel">
            <GhostSection kind="chart" height={ghostSizes.logsChart} />
          </div>
          <div className="panel">
            <GhostSection kind="list" height={ghostSizes.logsList} rows={10} />
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
        <GhostCard kind="metrics" height={ghostSizes.homeTop} />
        <GhostCard kind="list" height={ghostSizes.homeTop} rows={4} />
      </div>
      <div className="home-pair">
        <GhostCard kind="list" height={ghostSizes.homePair} rows={6} />
        <GhostCard kind="list" height={ghostSizes.homePair} rows={8} />
      </div>
      <GhostCard kind="worldmap" />
      <div className="home-quad">
        {homeLists.map((list) => (
          <GhostCard key={list} kind="list" height={ghostSizes.homeQuad} rows={5} />
        ))}
      </div>
      <GhostCard kind="list" height={ghostSizes.homeVitals} rows={8} />
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

type FieldSkeletonProps = { control?: string; hint?: 0 | 1 | 2 };

function FieldSkeleton({ control = "h-[37px]", hint = 1 }: FieldSkeletonProps) {
  return (
    <div className="grid gap-1.5">
      <Bar className="my-0.5 h-[13px] w-24" />
      <Bar className={control} />
      {hint > 0 ? <Bar className="my-0.5 h-3 w-full max-w-sm" /> : null}
      {hint > 1 ? <Bar className="my-0.5 h-3 w-2/3 max-w-xs" /> : null}
    </div>
  );
}

function ChoiceSkeleton({ height }: { height: string }) {
  return (
    <div className="grid gap-1.5">
      <Bar className="my-0.5 h-[13px] w-20" />
      <div className="grid gap-2 sm:grid-cols-2">
        <Bar className={`${height} rounded-[10px]`} />
        <Bar className={`${height} rounded-[10px]`} />
      </div>
    </div>
  );
}

function Caps({ width = "w-20" }: { width?: string }) {
  return <Bar className={`my-0.5 h-[13px] ${width}`} />;
}

function Subhead() {
  return <Bar className="my-[3px] h-3.5 w-20" />;
}

function Intro() {
  return (
    <div className="grid max-w-xl" aria-hidden="true">
      <Bar className="my-[3px] h-3.5" />
      <Bar className="my-[3px] h-3.5 w-2/3" />
    </div>
  );
}

function Submit({ width = "w-32" }: { width?: string }) {
  return <Bar className={`h-8 ${width}`} />;
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
        <FieldSkeleton />
        <FieldSkeleton />
        <FieldSkeleton />
        <ChoiceSkeleton height="h-[63px]" />
        <FieldSkeleton control="h-10" />
        <Submit />
      </div>
    </div>
  );
}

const tokenRows = ["first", "second"];

export function TokensSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" data-testid="tokens-skeleton">
      <AdminHeader meta />
      <Intro />
      <ListSkeleton rows={tokenRows} action />
      <section className="grid gap-4" aria-hidden="true">
        <Caps />
        <div className="grid max-w-xl gap-5">
          <FieldSkeleton />
          <ChoiceSkeleton height="h-[95px]" />
          <FieldSkeleton control="h-10" />
          <FieldSkeleton control="h-[37px] max-w-48" />
          <Submit width="w-28" />
        </div>
      </section>
    </div>
  );
}

const memberRows = ["first"];

export function MembersSkeleton() {
  return (
    <div className="grid gap-6" aria-busy="true" data-testid="members-skeleton">
      <AdminHeader meta />
      <Intro />
      <ListSkeleton rows={memberRows} action />
      <section className="grid gap-4" aria-hidden="true">
        <Caps width="w-28" />
        <div className="grid max-w-xl gap-5">
          <FieldSkeleton />
          <FieldSkeleton hint={0} />
          <div className="grid gap-1.5">
            <Bar className="my-0.5 h-[13px] w-24" />
            <Bar className="my-[3px] h-3.5 w-40" />
            <Bar className="h-20" />
            <Bar className="my-0.5 h-3 w-full max-w-sm" />
          </div>
          <Submit />
        </div>
      </section>
    </div>
  );
}

const featureRows = [82, 83, 99];
const connectionStats = ["accepted", "duplicates", "rejected", "rate"];

function KeyCard({ height, action = "w-16" }: { height: number; action?: string }) {
  return (
    <div className="card grid content-start gap-3 p-4" style={{ height }}>
      <div className="flex items-center justify-between gap-4">
        <Caps />
        <Bar className={`h-8 ${action}`} />
      </div>
      <Bar className="my-0.5 h-3 w-full max-w-sm" />
      <Bar className="my-0.5 h-3 w-2/3 max-w-xs" />
    </div>
  );
}

export function ConnectionSkeleton() {
  return (
    <div className="card grid gap-3 p-4" aria-hidden="true">
      <div className="flex h-5 items-center justify-between gap-4">
        <Bar className="h-3.5 w-24" />
        <Caps width="w-24" />
      </div>
      <Bar className="my-[3px] h-3.5 w-full max-w-xs" />
      <div className="grid grid-cols-4 gap-2">
        {connectionStats.map((stat) => (
          <div key={stat} className="grid h-[55px] content-start gap-0.5">
            <Bar className="my-0.5 h-3 w-14" />
            <Bar className="my-0.5 h-3 w-10" />
            <Bar className="mt-0.5 h-4 w-8" />
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
          <Caps />
          <div className="grid gap-7">
            <section className="grid gap-4">
              <Subhead />
              <FieldSkeleton hint={0} />
              <ChoiceSkeleton height="h-[79px]" />
            </section>
            <section className="grid gap-4">
              <Subhead />
              <FieldSkeleton control="h-[100px]" hint={2} />
              <FieldSkeleton />
            </section>
            <section className="grid gap-3">
              <Subhead />
              <div className="settings-group">
                {featureRows.map((height) => (
                  <div key={height} className="switch-row" style={{ height }}>
                    <span className="grid flex-1 gap-1.5">
                      <Bar className="h-3.5 w-32" />
                      <Bar className="h-3 w-full max-w-xs" />
                    </span>
                    <Bar className="h-5 w-9 rounded-full" />
                  </div>
                ))}
              </div>
            </section>
            <div className="flex items-center gap-3 border-t border-line pt-4">
              <Submit width="w-16" />
            </div>
          </div>
        </section>
        <section className="grid content-start gap-4">
          <Caps width="w-24" />
          <ConnectionSkeleton />
          <Caps width="w-12" />
          <KeyCard height={228} action="w-32" />
          <div className="grid gap-4">
            <KeyCard height={171} />
            <KeyCard height={121} />
            <KeyCard height={146} />
          </div>
          <KeyCard height={109} />
        </section>
      </div>
    </div>
  );
}
