import type { ReactNode } from "react";

import {
  Bone,
  ChipBones,
  DomainBone,
  ControlBones,
  ListBones,
  PanelHeadBones,
  SectionHeadBones,
  TitleBones,
} from "@/modules/shell/components/skeletons";

import { siteUrl } from "@/shared/config/site";

import { fieldGroups, trafficOptions } from "../logs";
import { metricViews } from "../metrics";
import { vitalViews } from "../speed";
import { dimensionLabel } from "../view-state";
import { sources } from "./breakdown-sections";
import { topLists } from "./overview-sections";

const listRows = 5;
const countryRows = 10;
const topRows = 10;
const logRows = 14;
const tableRows = 6;
const chartHeight = 240;
const tabWidths = [16, 48, 28, 48, 28, 48];
const realtimeCards = [
  { label: "Visitors now", hint: "Unique human visitors in the last five minutes" },
  { label: "Pageviews per minute", hint: "Over the last five minutes" },
  { label: "Active sessions", hint: "" },
];

function TabBones({ widths }: { widths: readonly number[] }) {
  return (
    <div className="tabs h-[31px] items-start" aria-hidden="true">
      {widths.map((width, index) => (
        <Bone key={index} width={width} height={20} />
      ))}
    </div>
  );
}

function TabLabels({ labels }: { labels: readonly string[] }) {
  return (
    <div className="tabs" aria-hidden="true">
      {labels.map((label) => (
        <span key={label} className="tab inline-block">
          {label}
        </span>
      ))}
    </div>
  );
}

function ListBlock({ title, rows }: { title?: string; rows: number }) {
  return (
    <div className="grid content-start gap-2">
      {title ? (
        <h3 className="text-sm font-semibold">{title}</h3>
      ) : (
        <Bone width={110} height={20} />
      )}
      <ListBones rows={rows} />
    </div>
  );
}

function TableBones({ rows }: { rows: number }) {
  return (
    <div className="grid gap-px" aria-hidden="true">
      <Bone height={28} />
      {Array.from({ length: rows }, (_, index) => (
        <Bone key={index} height={30} />
      ))}
    </div>
  );
}

function AnalyticsFrame({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <div
      className="mx-auto grid max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]"
      aria-busy="true"
    >
      <aside className="grid gap-6">{aside}</aside>
      <div className="panel">{children}</div>
    </div>
  );
}

function PanelFrame({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6" aria-busy="true">
      <div className="panel">{children}</div>
    </div>
  );
}

/**
 * @name VitalsCardSkeleton
 * @description The Core Web Vitals card in the web analytics rail, with its labels and empty bars.
 *
 * @example
 * <VitalsCardSkeleton />
 */
export function VitalsCardSkeleton() {
  return (
    <div className="metric-card metric-static" aria-hidden="true">
      <span className="metric-label text-sm">Core Web Vitals</span>
      <span className="grid gap-2 pt-1">
        {vitalViews.slice(0, 3).map((view) => (
          <span key={view.slug} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center">
            <span className="text-xs font-medium">{view.short}</span>
            <span className="share-bar" />
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * @name MetricRailSkeleton
 * @description The web analytics metric rail with each metric's label and room for its value and
 * sparkline.
 *
 * @example
 * <MetricRailSkeleton />
 */
export function MetricRailSkeleton() {
  return (
    <div className="rail" aria-hidden="true">
      {metricViews.map((view) => (
        <div key={view.slug} className="metric-card metric-static">
          <span className="metric-label text-sm">{view.label}</span>
          <Bone width={72} height={35} />
          <Bone height={32} />
        </div>
      ))}
    </div>
  );
}

function QuickActionsSkeleton() {
  return (
    <div className="hidden gap-2 lg:grid" aria-hidden="true">
      <h2 className="text-sm font-semibold">Quick actions</h2>
      <Bone width={120} height={20} />
      <Bone width={104} height={20} />
      <Bone width={96} height={20} />
    </div>
  );
}

/**
 * @name SummarySkeleton
 * @description The summary chart section: heading, split tabs, legend and the chart area.
 *
 * @example
 * <SummarySkeleton />
 */
export function SummarySkeleton() {
  return (
    <section className="panel-section grid gap-4" aria-hidden="true">
      <SectionHeadBones action />
      <TabBones widths={tabWidths} />
      <span className="grid gap-0.5">
        <Bone width={84} height={16} />
        <Bone width={60} height={35} />
      </span>
      <Bone height={chartHeight} />
    </section>
  );
}

/**
 * @name CountrySkeleton
 * @description The country section: the map and the top countries list.
 *
 * @example
 * <CountrySkeleton />
 */
export function CountrySkeleton() {
  return (
    <section className="panel-section grid gap-4" aria-hidden="true">
      <Bone width={200} height={30} />
      <div className="country-grid">
        <Bone height={272} />
        <ListBlock title="Top countries" rows={countryRows} />
      </div>
    </section>
  );
}

/**
 * @name SourcesSkeleton
 * @description The sources section: one list per source dimension in the two-column grid.
 *
 * @example
 * <SourcesSkeleton rows={5} />
 */
export function SourcesSkeleton({ rows = listRows }: { rows?: number }) {
  return (
    <section className="panel-section grid gap-4" aria-hidden="true">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Bone width={160} height={30} />
        <Bone width={100} height={32} />
      </header>
      <div className="source-grid">
        {sources.map((source) => (
          <div key={source.dimension} className="source-cell">
            <ListBlock title={source.title} rows={rows} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * @name WebAnalyticsSkeleton
 * @description The web analytics page before its URL and data are known, in the page's own layout.
 *
 * @example
 * <WebAnalyticsSkeleton />
 */
export function WebAnalyticsSkeleton() {
  return (
    <AnalyticsFrame
      aside={
        <>
          <VitalsCardSkeleton />
          <MetricRailSkeleton />
          <QuickActionsSkeleton />
        </>
      }
    >
      <PanelHeadBones>
        <ControlBones />
        <ChipBones />
      </PanelHeadBones>
      <SummarySkeleton />
      <CountrySkeleton />
      <SourcesSkeleton />
    </AnalyticsFrame>
  );
}

/**
 * @name VitalsRailSkeleton
 * @description The speed rail: the Real Experience Score and one card per Web Vital.
 *
 * @example
 * <VitalsRailSkeleton />
 */
export function VitalsRailSkeleton() {
  return (
    <div className="rail" aria-hidden="true">
      <div className="metric-card metric-static">
        <span className="metric-label text-sm">Real Experience Score</span>
        <Bone width={48} height={35} />
        <Bone width={80} height={16} />
      </div>
      {vitalViews.map((view) => (
        <div key={view.slug} className="metric-card metric-static">
          <span className="flex items-baseline justify-between gap-2">
            <span className="metric-label text-sm">{view.short}</span>
            <span className="text-xs text-muted">{view.label}</span>
          </span>
          <Bone width={72} height={35} />
          <span className="share-bar" />
        </div>
      ))}
    </div>
  );
}

/**
 * @name SpeedSummarySkeleton
 * @description The Web Vital summary section on the speed page.
 *
 * @example
 * <SpeedSummarySkeleton />
 */
export function SpeedSummarySkeleton() {
  return (
    <section className="panel-section grid gap-4" aria-hidden="true">
      <SectionHeadBones action />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <span className="grid gap-0.5">
          <Bone width={64} height={16} />
          <Bone width={96} height={35} />
        </span>
        <Bone width={320} height={16} />
      </div>
      <span className="grid gap-1.5">
        <Bone height={6} />
        <Bone width={260} height={16} />
      </span>
      <Bone height={chartHeight} />
    </section>
  );
}

/**
 * @name SpeedTableSkeleton
 * @description A speed section with its heading and a table, for routes and slow elements.
 *
 * @example
 * <SpeedTableSkeleton title="Routes" />
 */
export function SpeedTableSkeleton({ title }: { title?: string }) {
  return (
    <section className="panel-section grid gap-4" aria-hidden="true">
      <SectionHeadBones title={title} />
      <TableBones rows={tableRows} />
    </section>
  );
}

/**
 * @name SpeedSkeleton
 * @description The speed page before its URL and data are known, in the page's own layout.
 *
 * @example
 * <SpeedSkeleton />
 */
export function SpeedSkeleton() {
  return (
    <AnalyticsFrame aside={<VitalsRailSkeleton />}>
      <PanelHeadBones>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Bone width={110} height={28} />
          <Bone width={255} height={32} />
        </div>
        <div className="flex flex-wrap items-center gap-2" />
        <TabLabels labels={["All devices", "Desktop", "Mobile"]} />
      </PanelHeadBones>
      <SpeedSummarySkeleton />
      <SpeedTableSkeleton title="Routes" />
      <SpeedTableSkeleton />
    </AnalyticsFrame>
  );
}

function CardTitle({ children }: { children: string }) {
  return <h2 className="card-title">{children}</h2>;
}

/**
 * @name KpiRowSkeleton
 * @description The overview's four headline tiles with their labels.
 *
 * @example
 * <KpiRowSkeleton />
 */
export function KpiRowSkeleton() {
  return (
    <div className="kpi-row" aria-hidden="true">
      {metricViews.slice(0, 4).map((view) => (
        <div key={view.slug} className="kpi-tile">
          <span className="text-xs text-muted">{view.label}</span>
          <Bone width={56} height={29} />
          <Bone height={44} />
        </div>
      ))}
    </div>
  );
}

/**
 * @name OverviewCardSkeleton
 * @description The body of one overview card under its static title.
 *
 * @example
 * <OverviewCardSkeleton part="traffic" />
 */
export function OverviewCardSkeleton({
  part,
}: {
  part: "traffic" | "device" | "country" | "outcomes";
}) {
  if (part === "traffic") {
    return (
      <section className="card-section" aria-hidden="true">
        <CardTitle>Page views over time</CardTitle>
        <Bone width={96} height={16} />
        <Bone height={chartHeight} />
      </section>
    );
  }
  if (part === "device") {
    return (
      <section className="card-section" aria-hidden="true">
        <CardTitle>Page views by device type</CardTitle>
        <Bone height={chartHeight} />
      </section>
    );
  }
  if (part === "country") {
    return (
      <section className="card-section" aria-hidden="true">
        <header className="flex items-baseline justify-between gap-3">
          <CardTitle>Page views by country</CardTitle>
          <Bone width={60} height={16} />
        </header>
        <ListBones rows={countryRows - 2} />
      </section>
    );
  }
  return (
    <section className="card-section" aria-hidden="true">
      <CardTitle>Traffic outcomes</CardTitle>
      <Bone width={220} height={16} />
      <Bone height={20} />
    </section>
  );
}

/**
 * @name TopGridSkeleton
 * @description The overview's grid of top lists, one card per list with its title.
 *
 * @example
 * <TopGridSkeleton />
 */
export function TopGridSkeleton() {
  return (
    <div className="top-grid" aria-hidden="true">
      {topLists.map((list) => (
        <section key={list.dimension} className="card card-section">
          <ListBlock title={list.title} rows={topRows} />
        </section>
      ))}
    </div>
  );
}

/**
 * @name OverviewSkeleton
 * @description The traffic overview before its URL and data are known, in the page's own layout.
 *
 * @example
 * <OverviewSkeleton />
 */
export function OverviewSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1400px] gap-4" aria-busy="true">
      <header className="grid gap-3">
        <TitleBones title="Traffic overview" />
        <ControlBones />
        <ChipBones />
      </header>
      <KpiRowSkeleton />
      <div className="card">
        <OverviewCardSkeleton part="traffic" />
      </div>
      <div className="overview-split">
        <div className="card">
          <OverviewCardSkeleton part="device" />
        </div>
        <div className="card">
          <OverviewCardSkeleton part="country" />
        </div>
      </div>
      <div className="card">
        <OverviewCardSkeleton part="outcomes" />
      </div>
      <TopGridSkeleton />
    </div>
  );
}

/**
 * @name FieldsSkeleton
 * @description The log field sidebar with its group and field names.
 *
 * @example
 * <FieldsSkeleton />
 */
export function FieldsSkeleton() {
  return (
    <div className="field-sidebar" aria-hidden="true">
      {fieldGroups.map((group) => (
        <div key={group.label} className="field-group">
          <p className="field-group-label">{group.label}</p>
          {group.fields.map((field) => (
            <div key={field} className="field">
              <span className="field-summary">
                <span>{dimensionLabel(field)}</span>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * @name OutcomeChartSkeleton
 * @description The page views by outcome chart above the log.
 *
 * @example
 * <OutcomeChartSkeleton />
 */
export function OutcomeChartSkeleton() {
  return (
    <section className="panel-section grid gap-3" aria-hidden="true">
      <h2 className="text-sm font-medium">Page views by outcome over time</h2>
      <Bone width={220} height={16} />
      <Bone height={chartHeight} />
    </section>
  );
}

/**
 * @name EventLogSkeleton
 * @description The event log with its column header and placeholder rows.
 *
 * @example
 * <EventLogSkeleton />
 */
export function EventLogSkeleton() {
  return (
    <section className="log" aria-hidden="true">
      <div className="log-scroll">
        <div className="log-head">
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
        {Array.from({ length: logRows }, (_, index) => (
          <div key={index} className="log-row">
            <div className="log-line">
              <span />
              <Bone height={12} />
              <Bone height={12} />
              <Bone height={12} />
              <Bone height={12} />
              <Bone height={12} />
              <Bone height={12} />
              <Bone height={12} />
              <Bone height={12} />
              <Bone height={12} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * @name LogsSkeleton
 * @description The logs page before its URL and data are known, in the page's own layout.
 *
 * @example
 * <LogsSkeleton />
 */
export function LogsSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <header className="log-toolbar">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-serif text-3xl tracking-tight">Logs</h1>
          <DomainBone />
        </div>
        <ControlBones>
          <div className="segmented" aria-hidden="true">
            {trafficOptions.map((option) => (
              <span key={option.value} className="segment">
                {option.label}
              </span>
            ))}
          </div>
        </ControlBones>
        <div className="flex flex-wrap items-center gap-2" />
      </header>
      <div className="log-layout">
        <FieldsSkeleton />
        <div className="grid min-w-0 content-start gap-4">
          <div className="panel">
            <OutcomeChartSkeleton />
          </div>
          <div className="panel">
            <EventLogSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * @name ListSectionSkeleton
 * @description A panel section holding a table of rows, for the issue, visitor and visit lists.
 *
 * @example
 * <ListSectionSkeleton rows={12} />
 */
export function ListSectionSkeleton({ rows }: { rows: number }) {
  return (
    <section className="panel-section grid gap-4" aria-hidden="true">
      <TableBones rows={rows} />
    </section>
  );
}

/**
 * @name IssuesSkeleton
 * @description The issues page before its URL and data are known, in the page's own layout.
 *
 * @example
 * <IssuesSkeleton />
 */
export function IssuesSkeleton() {
  return (
    <PanelFrame>
      <PanelHeadBones>
        <p className="text-sm text-muted">
          Errors grouped by type, message and the top in-app frame, most recently seen first. Issues
          are not narrowed by the time range or filters.
        </p>
        <TabLabels labels={["Open", "Resolved", "Ignored"]} />
      </PanelHeadBones>
      <ListSectionSkeleton rows={8} />
    </PanelFrame>
  );
}

/**
 * @name VisitorsSkeleton
 * @description The visitors page before its URL and data are known, in the page's own layout.
 *
 * @example
 * <VisitorsSkeleton />
 */
export function VisitorsSkeleton() {
  return (
    <PanelFrame>
      <PanelHeadBones>
        <ControlBones />
        <ChipBones />
      </PanelHeadBones>
      <ListSectionSkeleton rows={16} />
    </PanelFrame>
  );
}

/**
 * @name DetailSkeleton
 * @description A visitor, session or issue page before its data is known: the back link, title,
 * facts row and the list below.
 *
 * @example
 * <DetailSkeleton back="Back to visitors" facts={4} />
 */
export function DetailSkeleton({
  back,
  facts,
  columns = "sm:grid-cols-4",
}: {
  back: string;
  facts: number;
  columns?: string;
}) {
  return (
    <PanelFrame>
      <header className="panel-section grid gap-4">
        <span className="text-xs text-link underline">{back}</span>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-serif text-2xl tracking-tight">
            <span className="skeleton inline-block w-60 max-w-full text-transparent select-none">
              Visitor
            </span>
          </h1>
          <DomainBone />
        </div>
        <div className={`grid grid-cols-2 gap-4 ${columns}`}>
          {Array.from({ length: facts }, (_, index) => (
            <span key={index} className="grid gap-0.5">
              <Bone width={56} height={16} />
              <Bone width={96} height={20} />
            </span>
          ))}
        </div>
      </header>
      <ListSectionSkeleton rows={8} />
    </PanelFrame>
  );
}

/**
 * @name RealtimeSkeleton
 * @description The realtime page before its data is known, in the page's own layout.
 *
 * @example
 * <RealtimeSkeleton />
 */
export function RealtimeSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1200px] gap-6" aria-busy="true">
      <TitleBones width={190} />
      <div className="mx-auto grid w-full max-w-[1200px] items-start gap-6 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="rail" aria-hidden="true">
          {realtimeCards.map((card) => (
            <div key={card.label} className="metric-card metric-static">
              <span className="metric-label text-sm">{card.label}</span>
              <Bone width={64} height={35} />
              {card.hint ? (
                <span className="text-xs text-muted">{card.hint}</span>
              ) : (
                <Bone width={160} height={16} />
              )}
            </div>
          ))}
          <Bone width={180} height={16} />
        </aside>
        <div className="panel" aria-hidden="true">
          <section className="panel-section grid gap-4">
            <header className="grid gap-1">
              <h2 className="text-base font-semibold">Live events</h2>
              <Bone width={420} height={20} />
            </header>
            <TableBones rows={12} />
          </section>
          <section className="panel-section grid gap-4">
            <h2 className="text-base font-semibold">Right now</h2>
            <div className="grid gap-6 md:grid-cols-2">
              <ListBlock title="Top pages" rows={listRows} />
              <ListBlock title="Top countries" rows={listRows} />
            </div>
          </section>
          <section className="panel-section grid gap-4">
            <header className="grid gap-1">
              <h2 className="text-base font-semibold">Active visitors</h2>
              <p className="text-sm text-muted">Who is on the site now, newest activity first.</p>
            </header>
            <TableBones rows={tableRows} />
          </section>
          <section className="panel-section grid gap-4">
            <header className="grid gap-1">
              <h2 className="text-base font-semibold">Active sessions</h2>
              <p className="text-sm text-muted">
                The pages each live session walked through, in order.
              </p>
            </header>
            <TableBones rows={tableRows} />
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * @name HomeSkeleton
 * @description The project list on the home page before the projects are read.
 *
 * @example
 * <HomeSkeleton />
 */
export function HomeSkeleton() {
  return (
    <div className="mx-auto grid max-w-[1040px] gap-6" aria-busy="true">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6">
        <div className="grid gap-1">
          <h1 className="font-serif text-3xl tracking-tight">Web analytics</h1>
          <p className="text-sm text-muted">
            Every project you can read, with its traffic over the last 24 hours.
          </p>
        </div>
        <div className="flex gap-2">
          <a href={`${siteUrl()}/docs`} className="ghost-button">
            Documentation
          </a>
          <Bone width={113} height={34} />
        </div>
      </header>
      <ul className="grid gap-2" aria-hidden="true">
        {[0, 1].map((index) => (
          <li key={index} className="site-row">
            <span className="grid gap-1">
              <Bone width={140} height={24} />
              <Bone width={220} height={16} />
              <Bone width={180} height={16} />
            </span>
            <Bone width={120} height={44} />
            <Bone width={120} height={44} />
          </li>
        ))}
      </ul>
    </div>
  );
}
