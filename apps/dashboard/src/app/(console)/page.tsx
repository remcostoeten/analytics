import type { Metadata } from "next";
import { connection } from "next/server";
import { Link } from "@/shared/ui/link";
import { cache, Suspense } from "react";

import { listProjects } from "@/modules/analytics/reads";
import { formatMetric } from "@/modules/analytics/format";
import { readSession } from "@/modules/session/session";
import { HomeSkeleton } from "@/modules/shell/components/skeletons";
import { serverClient } from "@/shared/api/server-client";
import { siteUrl } from "@/shared/config/site";
import { ExternalIcon } from "@/shared/ui/icons";

export const metadata: Metadata = { title: "Home" };

const created = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function createdAgo(timestamp: string) {
  const days = Math.round((Date.parse(timestamp) - Date.now()) / 86_400_000);
  if (days > -31) return created.format(days, "day");
  if (days > -365) return created.format(Math.round(days / 30), "month");
  return created.format(Math.round(days / 365), "year");
}

async function fetchTraffic() {
  const api = await serverClient();
  const traffic = await api
    .period("24h")
    .projectBreakdown({ metrics: ["pageviews", "visitors"], limit: 100 });
  return new Map(traffic.ok ? traffic.value.data.map((row) => [row.value, row]) : []);
}

const readTraffic = cache(fetchTraffic);

async function CreatedAgo({ timestamp }: { timestamp: string }) {
  await connection();
  return <> · created {createdAgo(timestamp)}</>;
}

type Props = { project: string; metric: "pageviews" | "visitors" };

async function Traffic({ project, metric }: Props) {
  const row = (await readTraffic()).get(project);
  return <dd className="text-xl tabular-nums">{formatMetric(row?.[metric] ?? 0, "count")}</dd>;
}

function TrafficCell({ project, metric, label }: Props & { label: string }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs text-muted">{label}</dt>
      <Suspense fallback={<dd className="skeleton h-7 w-12" />}>
        <Traffic project={project} metric={metric} />
      </Suspense>
    </div>
  );
}

async function Home() {
  const [projects, session] = await Promise.all([listProjects(), readSession()]);

  return (
    <div className="mx-auto grid max-w-[1040px] gap-6">
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
          {session.isAdmin ? (
            <Link href="/admin/projects/new" className="solid-button">
              Add a project
            </Link>
          ) : null}
        </div>
      </header>

      {!projects.ok ? (
        <p className="text-sm text-err">Could not list projects: {projects.error}</p>
      ) : projects.value.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          {session.user ? "No projects yet." : "No public projects. Sign in to see private ones."}
        </p>
      ) : (
        <ul className="grid gap-2">
          {projects.value.map((project) => {
            const href = `/projects/${encodeURIComponent(project.id)}`;
            return (
              <li key={project.id} className="site-row">
                <div className="grid min-w-0 gap-1">
                  <span className="flex items-center gap-2">
                    <Link href={href} className="truncate text-base font-semibold hover:underline">
                      {project.name}
                    </Link>
                    <a
                      href={`https://${project.domain}`}
                      aria-label={`Open ${project.domain}`}
                      className="text-link"
                    >
                      <ExternalIcon className="size-3.5" />
                    </a>
                  </span>
                  <span className="text-xs text-muted">
                    {project.domain}
                    <Suspense fallback={null}>
                      <CreatedAgo timestamp={project.createdAt} />
                    </Suspense>
                  </span>
                  <span className="flex flex-wrap gap-3 text-xs">
                    <Link href={href} className="text-link underline">
                      View analytics
                    </Link>
                    {session.isAdmin ? (
                      <Link href={`/admin${href}`} className="text-link underline">
                        Manage project
                      </Link>
                    ) : null}
                    <span className="text-muted">{project.visibility}</span>
                  </span>
                </div>
                <dl className="contents">
                  <TrafficCell
                    project={project.id}
                    metric="pageviews"
                    label="Page views (last 24 hours)"
                  />
                  <TrafficCell
                    project={project.id}
                    metric="visitors"
                    label="Visitors (last 24 hours)"
                  />
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}
