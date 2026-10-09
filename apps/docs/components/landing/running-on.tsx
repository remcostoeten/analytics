import { apiEndpoint } from "@/lib/api-endpoint";
import { formatCount } from "@/lib/format";
import { readProjects, showcaseQuery, type ShowcaseProject } from "@/lib/showcase";

import { CodeWindow } from "./code-window";
import { CountUp } from "./count-up";
import { ArrowUpRightIcon } from "./icons";
import { RunningOnViews } from "./running-on-views";
import { stagger } from "./stagger";

export async function RunningOn() {
  const [{ projects, list }, query] = await Promise.all([readProjects(), showcaseQuery()]);
  if (projects.length === 0) return null;
  return (
    <section className="container-land py-14 sm:py-20">
      <RunningOnViews
        endpoint={`${apiEndpoint()}/v2/projects`}
        intro={
          <div className="max-w-md">
            <h2 className="font-serif text-[2.4rem] leading-[1.1] font-light tracking-[-0.015em] sm:text-[2.9rem]">
              Running on
            </h2>
            <p className="mt-4 font-serif text-[1rem] leading-relaxed text-muted">
              Every public project on the production API, with its visitors over the last 30 days.
              Projects are public by default, so anyone can read these numbers.
            </p>
          </div>
        }
        cards={
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <li key={project.id} style={stagger(index)} className="reveal">
                <ProjectCard
                  project={project}
                  href={statsHref(project.id, query)}
                  gradient={`spark-${index}`}
                />
              </li>
            ))}
          </ul>
        }
        json={
          <CodeWindow title="GET /v2/projects" lang="json" code={JSON.stringify(list, null, 2)} />
        }
      />
    </section>
  );
}

function statsHref(id: string, query: string) {
  return `${apiEndpoint()}/v2/projects/${encodeURIComponent(id)}/stats?${query}`;
}

type Props = {
  project: ShowcaseProject;
  href: string;
  gradient: string;
};

function ProjectCard({ project, href, gradient }: Props) {
  const values = project.series.map((point) => point.value);
  return (
    <a
      href={href}
      rel="noreferrer"
      className="project-card group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-0.5"
    >
      <span aria-hidden="true" className="project-card-glow" />
      <span className="relative flex items-start gap-3 p-5 pb-0">
        <span className="tile-glow flex size-10 shrink-0 items-center justify-center rounded-xl font-serif text-[1.15rem] text-white">
          {project.name.charAt(0).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate font-serif text-[1.15rem] leading-tight text-fg">
            {project.name}
          </span>
          <span className="flex items-center gap-1.5 truncate font-mono text-[0.68rem] text-muted">
            <span className="animate-live size-1.5 shrink-0 rounded-full bg-ok" />
            {project.domain}
          </span>
        </span>
        <ArrowUpRightIcon className="size-4 shrink-0 text-muted transition-[color,translate] duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-fg" />
      </span>
      <span className="relative mt-6 flex items-end justify-between gap-4 px-5">
        <span className="flex flex-col gap-1">
          <span className="flex items-baseline gap-2">
            {project.visitors === null ? (
              <span className="font-mono text-[2rem] leading-none font-medium text-fg tabular-nums">
                ?
              </span>
            ) : (
              <CountUp
                value={project.visitors}
                className="font-mono text-[2rem] leading-none font-medium text-fg tabular-nums"
              />
            )}
            <Change value={project.change} />
          </span>
          <span className="text-[0.72rem] text-muted">visitors, 30 days</span>
        </span>
        {project.pageviews === null ? null : (
          <span className="flex flex-col items-end gap-1">
            <span className="font-mono text-[0.95rem] leading-none text-fg tabular-nums">
              {formatCount(project.pageviews)}
            </span>
            <span className="text-[0.72rem] text-muted">pageviews</span>
          </span>
        )}
      </span>
      <Sparkline values={values} gradient={gradient} />
    </a>
  );
}

function Change({ value }: { value: ShowcaseProject["change"] }) {
  if (value === null || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100);
  const tone =
    rounded > 0 ? "bg-ok/12 text-ok" : rounded < 0 ? "bg-err/10 text-err" : "bg-fg/6 text-muted";
  return (
    <span className={`rounded-full px-1.5 py-0.5 font-mono text-[0.62rem] tabular-nums ${tone}`}>
      {rounded > 0 ? "+" : ""}
      {rounded}%
    </span>
  );
}

const sparkWidth = 300;
const sparkHeight = 64;

function sparkPoints(values: number[]) {
  const max = Math.max(1, ...values);
  const step = (sparkWidth - 8) / Math.max(1, values.length - 1);
  return values.map((value, index) => ({
    x: index * step,
    y: sparkHeight - 8 - (value / max) * (sparkHeight - 16),
  }));
}

function smoothPath(points: { x: number; y: number }[]) {
  return points
    .map((point, index) => {
      if (index === 0) return `M${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
      const previous = points[index - 1];
      const mid = (previous.x + point.x) / 2;
      return `C${mid.toFixed(1)} ${previous.y.toFixed(1)} ${mid.toFixed(1)} ${point.y.toFixed(1)} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
    })
    .join(" ");
}

function Sparkline({ values, gradient }: { values: number[]; gradient: string }) {
  if (values.length < 2) return <span className="mt-5 block h-16" />;
  const points = sparkPoints(values);
  const line = smoothPath(points);
  const last = points[points.length - 1];
  return (
    <span aria-hidden="true" className="relative mt-5 block h-16">
      <svg
        viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}
        preserveAspectRatio="none"
        className="size-full overflow-visible"
      >
        <defs>
          <linearGradient id={`${gradient}-stroke`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--spark-from)" />
            <stop offset="1" stopColor="var(--accent)" />
          </linearGradient>
          <linearGradient id={`${gradient}-fill`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.18" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d={`${line} L${last.x} ${sparkHeight} L0 ${sparkHeight} Z`}
          fill={`url(#${gradient}-fill)`}
          className="spark-fill"
        />
        <path
          d={line}
          fill="none"
          stroke={`url(#${gradient}-stroke)`}
          strokeWidth="2"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          className="spark-line"
        />
      </svg>
      <span
        className="spark-dot absolute size-2 -translate-1/2 rounded-full bg-accent"
        style={{ left: `${(last.x / sparkWidth) * 100}%`, top: `${(last.y / sparkHeight) * 100}%` }}
      />
    </span>
  );
}
