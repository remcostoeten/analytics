"use client";

import type { BreakdownRow } from "@spoar/contract";
import { useEffect, useRef, useState, type MouseEvent } from "react";

import { countryName, formatCount, formatDuration, formatPercent } from "@/lib/format";
import type { ProjectDetail, ShowcaseProject } from "@/lib/showcase";

import { ArrowUpRightIcon, CloseIcon } from "./icons";
import { Change, Sparkline } from "./project-sparkline";
import { openProjectDetail } from "./project-detail-action";
import { stagger } from "./stagger";

type Props = {
  project: ShowcaseProject;
  href: string;
  gradient: string;
  onClose: () => void;
};

type Stats = NonNullable<ProjectDetail["stats"]>;

type Tile = {
  label: string;
  metric: keyof Stats;
  kind: "count" | "percent" | "duration" | "ratio";
  invert?: boolean;
};

type State =
  | { status: "loading" }
  | { status: "ready"; detail: ProjectDetail }
  | { status: "failed" };

const tiles: Tile[] = [
  { label: "Visitors", metric: "visitors", kind: "count" },
  { label: "Pageviews", metric: "pageviews", kind: "count" },
  { label: "Sessions", metric: "sessions", kind: "count" },
  { label: "Pages per session", metric: "pagesPerSession", kind: "ratio" },
  { label: "Bounce rate", metric: "bounceRate", kind: "percent", invert: true },
  { label: "Session", metric: "sessionDurationMs", kind: "duration" },
];

function formatTile(kind: Tile["kind"], value: number) {
  if (kind === "percent") return formatPercent(value);
  if (kind === "duration") return formatDuration(value);
  if (kind === "ratio") return value.toFixed(1);
  return formatCount(value);
}

function since(createdAt: string) {
  return new Intl.DateTimeFormat("en", { month: "short", year: "numeric" }).format(
    new Date(createdAt),
  );
}

export function ProjectDialog({ project, href, gradient, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    let active = true;
    openProjectDetail(project.id)
      .then((detail) => {
        if (active) setState(detail ? { status: "ready", detail } : { status: "failed" });
      })
      .catch(() => {
        if (active) setState({ status: "failed" });
      });
    return () => {
      active = false;
    };
  }, [project.id]);

  function onClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialog.current) onClose();
  }

  const values = project.series.map((point) => point.value);
  const stats = state.status === "ready" ? state.detail.stats : null;

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={onClick}
      aria-labelledby={`${project.id}-title`}
      className="project-dialog m-auto w-[min(100%-2rem,52rem)] rounded-2xl border border-line bg-surface p-0 text-fg shadow-[0_40px_80px_-40px_rgb(var(--shade)/0.5)] backdrop:bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] backdrop:backdrop-blur-sm"
    >
      <div className="animate-rise flex flex-col gap-6 p-5 sm:p-7">
        <header className="flex items-start gap-3">
          <span className="tile-glow flex size-11 shrink-0 items-center justify-center rounded-xl font-serif text-[1.3rem] text-white">
            {project.name.charAt(0).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <h3
              id={`${project.id}-title`}
              className="truncate font-serif text-[1.4rem] leading-tight"
            >
              {project.name}
            </h3>
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.7rem] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="animate-live size-1.5 shrink-0 rounded-full bg-ok" />
                {project.domain}
              </span>
              <span>tracked since {since(project.createdAt)}</span>
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-fg"
          >
            <CloseIcon className="size-4" />
          </button>
        </header>

        <div className="rounded-xl border border-line bg-bg/60 px-4 pt-4">
          <span className="flex items-baseline gap-2">
            <span className="font-mono text-[1.6rem] leading-none font-medium tabular-nums">
              {project.visitors === null ? "?" : formatCount(project.visitors)}
            </span>
            <Change value={project.change} />
            <span className="text-[0.72rem] text-muted">visitors a day, last 30 days</span>
          </span>
          <Sparkline values={values} gradient={gradient} className="mt-4 h-28" />
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((tile, index) => {
            const compared = stats?.[tile.metric];
            return (
              <div
                key={tile.metric}
                style={stagger(index)}
                className="rounded-xl border border-line p-3"
              >
                <dt className="text-[0.68rem] text-muted">{tile.label}</dt>
                <dd className="mt-1 flex items-baseline gap-2">
                  {compared ? (
                    <>
                      <span className="font-mono text-[1.1rem] leading-none font-medium tabular-nums">
                        {formatTile(tile.kind, compared.value)}
                      </span>
                      <Change value={compared.change} invert={tile.invert} />
                    </>
                  ) : (
                    <span className="font-mono text-[1.1rem] leading-none text-muted">
                      {state.status === "loading" ? "…" : "?"}
                    </span>
                  )}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="grid gap-3 sm:grid-cols-2">
          <Rows
            title="Top pages"
            rows={state.status === "ready" ? state.detail.pages : []}
            loading={state.status === "loading"}
          />
          <Rows
            title="Top sources"
            rows={state.status === "ready" ? state.detail.sources : []}
            loading={state.status === "loading"}
          />
          <Rows
            title="Countries"
            rows={state.status === "ready" ? state.detail.countries : []}
            loading={state.status === "loading"}
            label={countryName}
          />
          <Rows
            title="Devices"
            rows={state.status === "ready" ? state.detail.devices : []}
            loading={state.status === "loading"}
          />
        </div>

        {state.status === "failed" ? (
          <p className="text-[0.8rem] text-muted">The API gave no answer for this project.</p>
        ) : null}

        <footer className="flex flex-col justify-between gap-3 border-t border-dashed border-fg/15 pt-4 sm:flex-row sm:items-center">
          <span className="text-[0.75rem] text-muted">
            Public by default, so anyone can read these numbers.
          </span>
          <a
            href={href}
            rel="noreferrer"
            className="link-line inline-flex items-center gap-1.5 text-[0.85rem] text-fg"
          >
            Open in the dashboard
            <ArrowUpRightIcon className="size-3.5" />
          </a>
        </footer>
      </div>
    </dialog>
  );
}

function Rows({
  title,
  rows,
  loading,
  label = (value) => value,
}: {
  title: string;
  rows: BreakdownRow[];
  loading: boolean;
  label?: (value: string) => string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.visitors ?? 0));
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="text-[0.68rem] text-muted">{title}</div>
      {rows.length === 0 ? (
        <p className="mt-2 text-[0.72rem] text-muted">
          {loading ? "Reading…" : "Nothing in the last 30 days."}
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1">
          {rows.map((row, index) => (
            <li
              key={row.value}
              style={stagger(index)}
              className="grid grid-cols-[1fr_auto] items-center gap-2"
            >
              <span className="relative block h-6 overflow-hidden rounded-sm">
                <span
                  className="absolute inset-y-0 left-0 rounded-sm bg-accent/12"
                  style={{ width: `${((row.visitors ?? 0) / max) * 100}%` }}
                />
                <span className="relative block truncate px-1.5 font-mono text-[0.7rem] leading-6">
                  {label(row.value)}
                </span>
              </span>
              <span className="font-mono text-[0.68rem] text-muted tabular-nums">
                {formatCount(row.visitors ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
